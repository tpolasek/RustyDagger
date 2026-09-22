/**
 * arMound - the DOM rewrite of `DCourt.Screens.Wilds.arMound`
 * (`Wilds/arMound.java`).
 *
 * The Goblin Mound map.  Four of its portraits (warrens, treasury, throne room
 * and the dark vortex) are maps the hero has to buy or find first, so `init()`
 * shows them from the pack counts exactly as Java did.  The mound is dark: every
 * quest here needs a light source, and the vortex leads to a fixed monster
 * (`Vortex:Guard`).  `localPaint` also redraws the title in the mound's dark
 * brown after `super.localPaint()` - the DOM port draws it twice, like Java.
 */

import { Constants } from "../../Static/Constants";
import { registerScreenClass } from "../../Control/PlaceTable";
import { Tools } from "../../Tools/Tools";
import { COLORS, color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arGoblin } from "../Areas/Mound/arGoblin";
import { arQuest } from "../Quest/arQuest";
import { arNotice } from "../Utility/arNotice";
import { WildsScreen } from "../Template/WildsScreen";
import { arField } from "./arField";

export class arMound extends WildsScreen {
  static readonly FINDFIELDS: number = 50;
  static readonly FINDVORTEX: number = 100;
  static readonly weight: number[][] = [
    [5, 7, 3, 8, 4],
    [5, 5, 5, 7, 3],
    [5, 5, 5, 4, 2],
  ];
  static readonly beasts: string[][] = [
    ["Worm", "Thief", "Mage", "Gang", "Rager"],
    ["Worm", "Thief", "Mage", "Guard", "Vault"],
    ["Worm", "Thief", "Mage", "Queen", "Champ"],
  ];
  /** Java `static String[] fields` - the trail flavour text. */
  static readonly fields: string[] = [
    "You spy an old sign that reads: 'Town Ahead'",
    "You find a strand of flowers just coming into bloom.",
    "You pass a pond that is fresh and sweet.",
    "You see horse droppings and wagon tracks.",
    "You pass a herd of wild horses feeding quietly.",
    "Songbirds circle above you...",
    "You hear distant laughter, or is it applause?",
    "You pass a homestead that has been newly built...",
  ];

  /** `Tools.regionIs("arMound")` support (the status strip shows light). */
  override kind = "arMound";

  /** Java `arMound()`. */
  constructor() {
    super("The Bowels of the Goblin Mound");
    this.setBackground(color(192, 96, 48));
    this.setForeground(COLORS.white);
    this.setFont(Tools.textF);
    this.addPic(new Portrait("mndWarrens.jpg", "{1}Warrens", 145, 130, 96, 64));
    this.addPic(new Portrait("mndTreasury.jpg", "{1}Treasury", 30, 180, 96, 64));
    this.addPic(new Portrait("mndThrone.jpg", "{1}Throne Room", 280, 160, 96, 64));
    this.addPic(new Portrait("mndVortex.jpg", ">>Dark Vortex<<", 165, 25, 96, 64));
    this.addPic(new Portrait("mndFields.jpg", "{1}To Fields", 20, 40, 96, 64));
    // Java passed Tools.DEFAULT_HEIGHT (300) as the x of the Gobble Inn.
    this.addPic(new Portrait("Tavern.jpg", "Gobble Inn", Tools.DEFAULT_HEIGHT, 35, 96, 64));
    Screen.setPlace(Constants.MOUND);
  }

  /** Java `arMound.init()`: the four map-gated sites. */
  override init(): void {
    super.init();
    this.questInit();
    this.getPic(0)!.show(Screen.packCount("Map to Warrens") > 0);
    this.getPic(1)!.show(Screen.packCount("Map to Treasury") > 0);
    this.getPic(2)!.show(Screen.packCount("Map to Throne Room") > 0);
    this.getPic(3)!.show(Screen.packCount("Map to Vortex") > 0);
  }

  /** Java `arMound.localPaint(Graphics)`: the title again, in mound brown. */
  override localPaint(): void {
    super.localPaint();
    this.label(this.getTitle(), 10, 20, { font: "courtF", color: color(96, 48, 24) });
  }

  /** Java `arMound.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    switch (this.getPic(e.target)) {
      case 0:
        this.goQuesting(0);
        break;
      case 1:
        this.goQuesting(1);
        break;
      case 2:
        this.goQuesting(2);
        break;
      case 3:
        Tools.setRegion(this.enterVortex());
        break;
      case 4:
        Tools.setRegion(this.enterFields());
        break;
      case 5:
        Tools.setRegion(new arGoblin(this));
        break;
    }
    return super.action(e, o);
  }

  /** Java `needsLight(int loc)` - the mound is dark. */
  override needsLight(_loc: number): boolean {
    return true;
  }

  /** Java `getPower(int loc)`. */
  override getPower(_loc: number): number {
    return 3;
  }

  /** Java `getWhere(int pick)`. */
  override getWhere(_pick: number): string {
    return "Mound";
  }

  /** Java `Screen pickQuest(int loc)`. */
  override pickQuest(loc: number): Screen {
    return new arQuest(
      this,
      3,
      "Goblin Mound Quest",
      this.selectQuest(loc, arMound.beasts, arMound.weight),
    );
  }

  /** Java `Screen enterFields()`. */
  private enterFields(): Screen {
    const h = Screen.getHero();
    if (Screen.getQuests() < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    if (!Tools.contest(Number(h.getWits()), arMound.FINDFIELDS)) {
      return this.pickQuest(0);
    }
    const msg =
      "\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t" +
      arMound.fields[Tools.roll(arMound.fields.length)] +
      "\n\n\tYou Enter the Fields...\n" +
      String(h.gainWits(1));
    h.addFatigue(1);
    return new arNotice(new arField(), msg);
  }

  /** Java `Screen enterVortex()`. */
  private enterVortex(): Screen {
    if (Screen.getQuests() < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    return new arQuest(
      this,
      new arNotice(this, "entering the vortex"),
      4,
      "Vortex Mouth",
      Screen.findBeast("Vortex:Guard"),
    );
  }
}

// Self-registration: Java reached this screen through
// `Class.forName("DCourt.Screens.Wilds.arMound").newInstance()`; the port stores the
// factory in `Control/ScreenRegistry` instead (see `./index.ts`, which also
// registers the whole folder).
registerScreenClass("Wilds.arMound", arMound);
