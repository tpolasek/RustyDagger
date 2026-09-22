/**
 * arField - the DOM rewrite of `DCourt.Screens.Wilds.arField`
 * (`Wilds/arField.java`).
 *
 * The fields around Salamander Township: six map portraits (town road, healer's
 * tower, quest, camp/exit, forest road, goblin mound) whose rectangles are the
 * hit regions, routed through `getPic(e.target)` exactly as in Java.  The two
 * "locked" portraits (forest road lvl 4+, goblin mound lvl 8+) are shown in
 * `init()`.
 *
 * The neighbouring screens (`arTown`, `arHealer`, `arQuest`, `arNotice`,
 * `arForest`, `arMound`) belong to the Areas/Quest/Utility groups and are
 * imported exactly as Java imported their classes.
 */

import { Constants } from "../../Static/Constants";
import { registerScreenClass } from "../../Control/PlaceTable";
import { Tools } from "../../Tools/Tools";
import { color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arHealer } from "../Areas/Fields/arHealer";
import { arTown } from "../Areas/arTown";
import { arQuest } from "../Quest/arQuest";
import { arNotice } from "../Utility/arNotice";
import { WildsScreen } from "../Template/WildsScreen";
import { arForest } from "./arForest";
import { arMound } from "./arMound";

export class arField extends WildsScreen {
  /** Java `String[] forests`. */
  protected readonly forests: string[] = [
    "You spy an old sign that reads: 'Danger!'",
    "You find a human skull with an arrow embedded in it...",
    "You pass a pond that is obviously poisonous.",
    "You find animal droppings. There are chainmail links in it...",
    "You find a horse skeleton. Something big was eating it...",
    "Vultures circle above you...",
    "You hear distance howling, or is it screaming?",
    "You pass a homestead that has been burned to the ground...",
  ];
  static readonly FINDFOREST: number = 40;
  static readonly hiweight: number[] = [8, 6, 4, 5, 2, 5, 2];
  static readonly loweight: number[] = [12, 10, 6, 10, 2, 1, 0];
  static readonly beasts: string[] = [
    "Rodent",
    "Goblin",
    "Centaur",
    Constants.MERCHANT,
    "Wizard",
    Constants.GYPSY,
    "Soldier",
  ];

  /** `Tools.regionIs("arField")` support (see ui/stage.ts). */
  override kind = "arField";

  /** Java `arField()`. */
  constructor() {
    super("The Fields near Salamander Township");
    this.setBackground(color(255, 128, 128));
    this.setForeground(color(192, 64, 64));
    Tools.setHeroPlace(Constants.FIELDS);
  }

  /** Java `arField.createTools()`: the six map hit regions. */
  override createTools(): void {
    this.addPic(new Portrait("fldTown.jpg", "Town Road", 30, arField.FINDFOREST, 96, 64));
    this.addPic(new Portrait("Tower.jpg", "Healers Tower", 320, 55, 64, 96));
    this.addPic(new Portrait("fldQuest.jpg", "{1}Quest!", 145, 135, 96, 64));
    this.addPic(new Portrait("fldCamp.jpg", "Exit Game", 265, 185, 96, 64));
    this.addPic(new Portrait("fldForest.jpg", "{1}Forest Road", 10, 180, 96, 64));
    this.addPic(new Portrait("fldMound.jpg", "{1}Goblin Mound", 190, 30, 96, 64));
  }

  /** Java `arField.init()`: level-gated roads. */
  override init(): void {
    super.init();
    this.questInit();
    this.getPic(4)!.show(Number(Tools.getHero().getLevel()) >= 4);
    this.getPic(5)!.show(Number(Tools.getHero().getLevel()) >= 8);
  }

  /** Java `arField.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    switch (this.getPic(e.target)) {
      case 0:
        Tools.setRegion(new arTown());
        break;
      case 1:
        Tools.setRegion(new arHealer(this));
        break;
      case 2:
        this.goQuesting();
        break;
      case 3:
        Tools.setRegion(Screen.tryToExit(this, Constants.FIELDS, 0));
        break;
      case 4:
        Tools.setRegion(this.enterForest());
        break;
      case 5:
        Tools.setRegion(this.enterMound());
        break;
    }
    return super.action(e, o);
  }

  /** Java `Screen enterForest()`. */
  private enterForest(): Screen {
    const h = Tools.getHero();
    if (Number(h.getQuests()) < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    if (!Tools.contest(Number(h.getWits()), arField.FINDFOREST)) {
      return Number(h.getLevel()) >= 6
        ? this.pickQuest(0)
        : new arNotice(
            this.pickQuest(0),
            "\tYou start hiking towards the distant woods. You are making good time, when suddenly...",
          );
    }
    const msg =
      "\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t" +
      this.forests[Tools.roll(this.forests.length)] +
      "\n\n\tYou Enter the Forest...\n" +
      String(h.gainWits(2));
    h.travelWork(1);
    return new arNotice(new arForest(), msg);
  }

  /** Java `Screen enterMound()`. */
  private enterMound(): Screen {
    return Screen.getQuests() < 1
      ? new arNotice(this, WildsScreen.TOO_TIRED)
      : new arQuest(this, new arMound(), 2, "Goblin Mound Quest", Screen.findBeast("Mound:Gate"));
  }

  /** Java `getPower(int loc)`. */
  override getPower(_loc: number): number {
    return 1;
  }

  /** Java `getWhere(int loc)`. */
  override getWhere(_loc: number): string {
    return "Fields";
  }

  /** Java `Screen pickQuest(int loc)`. */
  override pickQuest(_loc: number): Screen {
    return new arQuest(
      this,
      1,
      "Fields Quest",
      this.selectQuest(
        arField.beasts,
        Number(Screen.getHero().getLevel()) < 3 ? arField.loweight : arField.hiweight,
      ),
    );
  }
}

// Self-registration: Java reached this screen through
// `Class.forName("DCourt.Screens.Wilds.arField").newInstance()`; the port stores the
// factory in `Control/ScreenRegistry` instead (see `./index.ts`, which also
// registers the whole folder).
registerScreenClass("Wilds.arField", arField);
