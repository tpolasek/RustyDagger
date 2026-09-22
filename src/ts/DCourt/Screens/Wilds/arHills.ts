/**
 * arHills - the DOM rewrite of `DCourt.Screens.Wilds.arHills`
 * (`Wilds/arHills.java`).
 *
 * The Fenris Mountains map.  Like arForest, three portraits (jewel store, magic
 * shop, abandoned mines) start hidden and are revealed by a successful search
 * over the `hidden` bit field.  Every quest here needs light, and climbing to
 * the mines needs rope (`needsRope`/`findClimb`).
 */

import { Constants } from "../../Static/Constants";
import { registerScreenClass } from "../../Control/PlaceTable";
import { Tools } from "../../Tools/Tools";
import { COLORS, color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arGemShop } from "../Areas/Hills/arGemShop";
import { arMagicShop } from "../Areas/Hills/arMagicShop";
import { arQuest } from "../Quest/arQuest";
import { arNotice } from "../Utility/arNotice";
import { WildsScreen } from "../Template/WildsScreen";
import { arForest } from "./arForest";

export class arHills extends WildsScreen {
  /** Java `int hidden = 7` - the three hidden sites. */
  protected hidden: number = 7;
  /** Java `String[] forests` - the trail flavour text. */
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
  static readonly SEARCH: number = 80;
  static readonly weights: number[] = [7, 5, 5, 4, 3, 3];
  static readonly beasts: string[] = ["Goat", "Basilisk", "Troll", "Wyvern", "Giant", "Sphinx"];
  static readonly found: string[] = [
    "The Jewel Exchange atop a misty peak!\n",
    "Djinni's Magic Shop floating on a cloud!\n",
    "A dangerous shaft leading to the Abandoned Mines!\n",
  ];

  /** `Tools.regionIs("arHills")` support (see ui/stage.ts). */
  override kind = "arHills";

  /** Java `arHills()`. */
  constructor() {
    super("High Crags of the Fenris Mountains");
    this.setBackground(color(160, 160, 160));
    this.setForeground(COLORS.white);
    this.setFont(Tools.textF);
    // Java passed Tools.DEFAULT_HEIGHT (300) as the x of the two right-hand
    // portraits; kept verbatim.
    this.addPic(new Portrait("hllJewels.jpg", "Jewel Store", Tools.DEFAULT_HEIGHT, 20, 96, 64));
    this.addPic(new Portrait("hllMagics.jpg", "Magic Shop", 20, arHills.FINDFOREST, 96, 64));
    this.addPic(new Portrait("hllMines.jpg", "{1}Abandoned Mines", 150, 180, 96, 64));
    this.addPic(new Portrait("hllQuest.jpg", "{1}Quest", 170, arHills.SEARCH, 96, 64));
    this.addPic(new Portrait("hllCamp.jpg", "Exit Game", 10, 175, 96, 64));
    this.addPic(
      new Portrait("hllForest.jpg", "{1}Forest Trail", Tools.DEFAULT_HEIGHT, 180, 96, 64),
    );
    Screen.setPlace(Constants.HILLS);
    for (let ix = 0; ix < 3; ix++) {
      this.getPic(ix)!.hide();
    }
  }

  /** Java `arHills.init()`. */
  override init(): void {
    super.init();
    this.questInit();
  }

  /** Java `arHills.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    switch (this.getPic(e.target)) {
      case 0:
        Tools.setRegion(new arGemShop(this));
        break;
      case 1:
        Tools.setRegion(new arMagicShop(this));
        break;
      case 2:
        Tools.setRegion(this.cavern());
        break;
      case 3:
        this.goQuesting();
        break;
      case 4:
        Tools.setRegion(Screen.tryToExit(this, Constants.HILLS, 0));
        break;
      case 5:
        Tools.setRegion(this.forest());
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
    if (pick < 0 || pick >= arHills.found.length) {
      return "???";
    }
    this.getPic(pick)!.show();
    return "While hiking over rocky ridges you discover...\n\n" + arHills.found[pick];
  }

  /** Java `needsRope(int loc)` - the mines always do. */
  override needsRope(_loc: number): boolean {
    return true;
  }

  /** Java `getPower(int loc)`. */
  override getPower(_loc: number): number {
    return 3;
  }

  /** Java `getWhere(int loc)`. */
  override getWhere(_loc: number): string {
    return "Hills";
  }

  /** Java `Screen pickQuest(int loc)`. */
  override pickQuest(_loc: number): Screen {
    return new arQuest(this, 3, "Mountain Quest", this.selectQuest(arHills.beasts, arHills.weights));
  }

  /** Java `Screen forest()`: the trail back down to the forest. */
  private forest(): Screen {
    const h = Screen.getHero();
    if (Number(h.getQuests()) < 1) {
      return new arNotice(this, WildsScreen.TOO_TIRED);
    }
    if (!Tools.contest(Number(h.getWits()), arHills.FINDFOREST)) {
      return this.pickQuest(0);
    }
    const msg =
      "\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t" +
      this.forests[Tools.roll(this.forests.length)] +
      "\n\n\tYou Enter the Forest...\n" +
      String(h.gainWits(2));
    h.travelWork(1);
    return new arNotice(new arForest(), msg);
  }

  /** Java `Screen cavern()`: the Abandoned Mines, rope permitting. */
  private cavern(): Screen {
    return Screen.getQuests() < 1
      ? new arNotice(this, WildsScreen.TOO_TIRED)
      : !this.findClimb()
        ? new arNotice(this, WildsScreen.NEED_ROPE)
        : new arQuest(this, this, 5, "Deep Mines Quest", Screen.findBeast("Hills:Dragon"));
  }
}

// Self-registration: Java reached this screen through
// `Class.forName("DCourt.Screens.Wilds.arHills").newInstance()`; the port stores the
// factory in `Control/ScreenRegistry` instead (see `./index.ts`, which also
// registers the whole folder).
registerScreenClass("Wilds.arHills", arHills);
