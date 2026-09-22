/**
 * arCastle - the DOM rewrite of `DCourt.Screens.Wilds.arCastle`
 * (`Wilds/arCastle.java`).
 *
 * The central courtyard of Dragon Keep: town gate, royal court, dunjeons
 * (lvl 8+), clan hall, post office and the docks (lvl 10+).  Two things make
 * this screen special and both are ported verbatim:
 *
 *  - the Royal Court leads to `arQueen` while the hero has social rank, and to
 *    a normal quest otherwise (`goQueen`);
 *  - the docks run their own quest logic (`goQuesting(2..4)`): a wits contest
 *    against FIND_OCEAN decides whether the hero finds anything, then the
 *    Rutters for Hie Brasil / Shangala gate the far-off countries.
 */

import { registerScreenClass } from "../../Control/PlaceTable";
import { Tools } from "../../Tools/Tools";
import { color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arClanHall } from "../Areas/Castle/arClanHall";
import { arPostal } from "../Areas/Castle/arPostal";
import { arQueen } from "../Areas/arQueen";
import { arTown } from "../Areas/arTown";
import { arQuest } from "../Quest/arQuest";
import { arNotice } from "../Utility/arNotice";
import { WildsScreen } from "../Template/WildsScreen";

export class arCastle extends WildsScreen {
  /** Java `String[] place` - the monster-table prefix per region. */
  protected readonly place: string[] = ["Castle", "Dunjeon", "Ocean", "Brasil", "Shang"];
  /** Java `int[] power` - the quest weight per region. */
  protected readonly power: number[] = [4, 2, 3, 4, 5];
  static readonly FIND_OCEAN: number = 100;
  static readonly weight: number[][] = [
    [1],
    [7, 6, 5, 4, 3, 2],
    [5, 3, 2],
    [6, 5, 4, 3, 2],
    [6, 7, 2, 6, 5, 3, 2],
  ];
  static readonly beasts: string[][] = [
    ["Guard"],
    ["Rodent", "Snot", "Rager", "Gang", "Troll", "Mage"],
    ["Traders", "Serpent", "Mermaid"],
    ["Harpy", "Fighter", "Golem", "Medusa", "Hero"],
    ["Gunner", "Peasant", "Ninja", "Plague", "Shogun", "Panda", "Samurai"],
  ];
  static readonly DOCKS_FAILURE: string =
    "\tYou plot a course with confidence.  But after days of fruitless searching you must return for additional provisions.\n\n\t";
  static readonly DOCKS_SUCCESS: string =
    "\tYou plot a course with confidence.  After hours of searching you encounter oceanic inhabitants.\n\n\t";
  static readonly DOCKS_BRASIL: string =
    " \tYou plot a course with confidence.  After days of travel you arrive on the shores of Hie Brasil.\n\n\t";
  static readonly DOCKS_SHANG: string =
    "\tYou plot a course with confidence.  After a week of travel you arrive on the shores of Shangala.\n\n\t";
  /** Java `String[] oceans` - the sailing flavour text. */
  static readonly oceans: string[] = [
    "You spy an bouy marking low waters...",
    "You find a barrel floating on the waves...",
    "You pass a stretch of choking seaweed.",
    "You catch an odd fish with bulging eyeballs...",
    "A dolphin swims circles around your ship...",
    "Seagulls circle above you...",
    "You hear distance groans from some sea beast...",
    "You find planks from a ship that broke apart...",
  ];

  /** `Tools.regionIs("arCastle")` support (see ui/stage.ts). */
  override kind = "arCastle";

  /** Java `arCastle()`. */
  constructor() {
    super("The Central Courtyard of Dragon Keep");
    this.setBackground(color(255, 128, 255));
    this.setForeground(color(128, 0, 128));
  }

  /** Java `arCastle.createTools()`: the six map hit regions. */
  override createTools(): void {
    this.addPic(new Portrait("cstTown.jpg", "Town Gate", 20, 175, 96, 64));
    this.addPic(new Portrait("toCastle.jpg", "Royal Court", 155, 45, 96, 64));
    this.addPic(new Portrait("cstDunjeon.jpg", "{1}Dunjeons", 15, 70, 96, 64));
    this.addPic(new Portrait("Tower.jpg", "Clan Hall", 295, 40, 64, 96));
    this.addPic(new Portrait("cstPostal.jpg", "Post Office", 140, 170, 96, 64));
    this.addPic(new Portrait("cstDocks.jpg", "{1}Docks", 280, 180, 96, 64));
  }

  /** Java `arCastle.init()`: level-gated dunjeons/docks, then the level check. */
  override init(): void {
    super.init();
    this.getPic(2)!.show(Screen.getLevel() >= 8);
    this.getPic(5)!.show(Screen.getLevel() >= 10);
    Screen.getHero().tryToLevel(this);
  }

  /** Java `arCastle.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    switch (this.getPic(e.target)) {
      case 0:
        Tools.setRegion(new arTown());
        break;
      case 1:
        this.goQueen();
        break;
      case 2:
        this.goQuesting(1);
        break;
      case 3:
        Tools.setRegion(new arClanHall(this));
        break;
      case 4:
        Tools.setRegion(new arPostal(this));
        break;
      case 5:
        this.goQuesting(2);
        break;
    }
    return super.action(e, o);
  }

  /** Java `goQueen()`: royalty for the ranked, a quest for everyone else. */
  private goQueen(): void {
    if (Screen.getSocial() > 0) {
      Tools.setRegion(new arQueen(this));
    } else {
      this.goQuesting(0);
    }
  }

  /** Java `getPower(int loc)`. */
  override getPower(loc: number): number {
    return this.power[loc];
  }

  /** Java `getWhere(int loc)`. */
  override getWhere(loc: number): string {
    return this.place[loc];
  }

  /** Java `needsLight(int loc)` - only the dunjeons. */
  override needsLight(loc: number): boolean {
    return loc === 1;
  }

  /** Java `goQuesting(int loc)`: the docks run their own course. */
  override goQuesting(loc: number): void {
    if (loc < 2) {
      super.goQuesting(loc);
    } else if (this.testAdvance(loc)) {
      if (!Tools.contest(Screen.getWits(), arCastle.FIND_OCEAN)) {
        Tools.setRegion(new arNotice(this, arCastle.DOCKS_FAILURE.concat(Tools.select(arCastle.oceans))));
        Screen.getHero().addFatigue(1);
      } else if (Screen.packCount("Rutter for Shangala") > 0 && Tools.percent(70)) {
        super.goQuesting(4);
      } else if (Screen.packCount("Rutter for Hie Brasil") <= 0 || !Tools.percent(70)) {
        super.goQuesting(2);
      } else {
        super.goQuesting(3);
      }
    }
  }

  /** Java `Screen pickQuest(int loc)`. */
  override pickQuest(loc: number): Screen {
    const beast = this.selectQuest(loc, arCastle.beasts, arCastle.weight);
    let next: Screen = this;
    if (loc === 0) {
      next = new arQueen(this);
    }
    return new arQuest(this, next, this.getPower(loc), `${this.getWhere(loc)} Quest`, beast);
  }
}

// Self-registration: Java reached this screen through
// `Class.forName("DCourt.Screens.Wilds.arCastle").newInstance()`; the port stores the
// factory in `Control/ScreenRegistry` instead (see `./index.ts`, which also
// registers the whole folder).
registerScreenClass("Wilds.arCastle", arCastle);
