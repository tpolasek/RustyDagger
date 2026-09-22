/**
 * arForest - the DOM rewrite of `DCourt.Screens.Wilds.arForest`
 * (`Wilds/arForest.java`).
 *
 * The Arcane Forest map.  Three portraits (smithy, guild and the mountain
 * trail) start hidden and are revealed by a successful search: the `hidden`
 * bit field still tracks which sites have been found, and `markFound` clears
 * the matching bit and shows the portrait - so a site stays visible for the
 * rest of the session, exactly as in Java.
 *
 * Naming note: Java's `fields()` and `hills()` methods would collide with the
 * `fields`/`hills` arrays of the same name in JS (a class cannot carry both), so
 * they are `fieldsTrail()` / `hillsTrail()` here.  Both were package-private in
 * Java, so no call site outside this file is affected.
 */

import { Constants } from "../../Static/Constants";
import { registerScreenClass } from "../../Control/PlaceTable";
import { Tools } from "../../Tools/Tools";
import { color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arDwfSmith } from "../Areas/Forest/arDwfSmith";
import { arGuild } from "../Areas/Forest/arGuild";
import { arQuest } from "../Quest/arQuest";
import { arNotice } from "../Utility/arNotice";
import { WildsScreen } from "../Template/WildsScreen";
import { arField } from "./arField";
import { arHills } from "./arHills";

export class arForest extends WildsScreen {
  /** Java `int hidden = 7` - the three hidden sites. */
  protected hidden: number = 7;
  /** Java `String[] fields` / `String[] hills` - travel flavour text. */
  protected readonly fields: string[] = [
    "You spy an old sign that reads: 'Town Ahead'",
    "You find a strand of flowers just coming into bloom.",
    "You pass a pond that is fresh and sweet.",
    "You see horse droppings and wagon tracks.",
    "You pass a herd of wild horses feeding quietly.",
    "Songbirds circle above you...",
    "You hear distant laughter, or is it applause?",
    "You pass a homestead that has been newly built...",
  ];
  protected readonly hills: string[] = [
    "You spy an old sign that reads: 'Djini Crossing'",
    "You find a strand of scrubby flowers clinging to a crevice.",
    "You pass a trickling mountain stream.",
    "You see the paw prints of some large cat.",
    "You spy a herd of sheep in the distance.",
    "Flys circle around you...",
    "You hear distant water, or is it wind?",
    "You pass a cave that smells of bear...",
  ];
  static readonly FINDHILLS: number = 80;
  static readonly SEARCH: number = 40;
  static readonly FINDFIELDS: number = 20;
  static readonly weights: number[] = [10, 9, 8, 6, 4, 3];
  static readonly beasts: string[] = ["Boar", "Orc", "Elf", "Gryphon", "Snot", "Unicorn"];
  static readonly found: string[] = [
    "The Forest Smithy, hidden in an enchanted grove!\n",
    "The Free Adventurers Guild in a maze of shrubbery!\n",
    "The secret path to the Fenris Mountains!\n",
  ];

  /** `Tools.regionIs("arForest")` support (see ui/stage.ts). */
  override kind = "arForest";

  /** Java `arForest()`: the three hidden portraits start hidden. */
  constructor() {
    super("The Depths of the Arcane Forest");
    this.setBackground(color(0, 128, 0));
    this.setForeground(color(128, 255, 128));
    this.setFont(Tools.textF);
    this.addPic(new Portrait("Weapon.jpg", "Smithy", 20, 170, 96, 64));
    this.addPic(new Portrait("Tower.jpg", "The Guild", 320, 150, 64, 96));
    this.addPic(new Portrait("fstHills.jpg", "{1}Mountain Trail", 10, 30, 96, 64));
    this.addPic(new Portrait("toFields.jpg", "{1}To Fields", Tools.DEFAULT_HEIGHT, 10, 96, 64));
    this.addPic(new Portrait("fstQuest.jpg", "{1}Quest!", 160, 60, 96, 64));
    this.addPic(new Portrait("fstCamp.jpg", "Exit Game", 180, 180, 96, 64));
    for (let i = 0; i < 3; i++) {
      this.getPic(i)!.hide();
    }
    Screen.setPlace(Constants.FOREST);
  }

  /** Java `arForest.init()`. */
  override init(): void {
    super.init();
    this.questInit();
  }

  /** Java `arForest.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    switch (this.getPic(e.target)) {
      case 0:
        Tools.setRegion(new arDwfSmith(this));
        break;
      case 1:
        Tools.setRegion(new arGuild(this));
        break;
      case 2:
        Tools.setRegion(this.hillsTrail());
        break;
      case 3:
        Tools.setRegion(this.fieldsTrail());
        break;
      case 4:
        this.goQuesting();
        break;
      case 5:
        Tools.setRegion(Screen.tryToExit(this, Constants.FOREST, 0));
        break;
    }
    return super.action(e, o);
  }

  /** Java `getHideBits()`. */
  override getHideBits(): number {
    return this.hidden;
  }

  /** Java `markFound(int pick)`: clear the bit and reveal the portrait. */
  override markFound(pick: number): string {
    this.hidden &= 65535 ^ (1 << pick);
    if (pick < 0 || pick >= arForest.found.length) {
      return "???";
    }
    this.getPic(pick)!.show();
    return "While trudging through the woods you discover...\n\n" + arForest.found[pick];
  }

  /** Java `getPower(int loc)`. */
  override getPower(_loc: number): number {
    return 2;
  }

  /** Java `getWhere(int loc)`. */
  override getWhere(_loc: number): string {
    return "Forest";
  }

  /** Java `Screen pickQuest(int loc)`. */
  override pickQuest(_loc: number): Screen {
    return new arQuest(this, 2, "Forest Quest", this.selectQuest(arForest.beasts, arForest.weights));
  }

  /** Java `Screen fields()`: the trail back down to the fields. */
  private fieldsTrail(): Screen {
    const h = Screen.getHero();
    if (Screen.getQuests() < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    if (!Tools.contest(Number(h.getWits()), arForest.FINDFIELDS)) {
      return this.pickQuest(0);
    }
    const msg =
      "\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t" +
      this.fields[Tools.roll(this.fields.length)] +
      "\n\n\tYou Enter the Fields...\n" +
      String(h.gainWits(1));
    h.travelWork(1);
    return new arNotice(new arField(), msg);
  }

  /** Java `Screen hills()`: the trail up into the mountains. */
  private hillsTrail(): Screen {
    const h = Screen.getHero();
    if (Number(h.getQuests()) < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    if (!Tools.contest(Number(h.getWits()), arForest.FINDHILLS)) {
      return this.pickQuest(0);
    }
    const msg =
      "\tYou march along a rising trail, admiring the spreading vista where mountain meets forest.\n\n\t" +
      // Java indexed `hills` with `this.fields.length`; kept verbatim (both are 8).
      this.hills[Tools.roll(this.fields.length)] +
      "\n\n\tYou Enter the Mountains...\n" +
      String(h.gainWits(3));
    h.travelWork(1);
    return new arNotice(new arHills(), msg);
  }
}

// Self-registration: Java reached this screen through
// `Class.forName("DCourt.Screens.Wilds.arForest").newInstance()`; the port stores the
// factory in `Control/ScreenRegistry` instead (see `./index.ts`, which also
// registers the whole folder).
registerScreenClass("Wilds.arForest", arForest);
