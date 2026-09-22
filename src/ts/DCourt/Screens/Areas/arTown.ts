/**
 * Port of `DCourt/Screens/Areas/arTown.java` - Salamander Township, the hub
 * screen the hero sees while resting in town (PlaceTable launch
 * `Areas.arTown`).
 *
 * Java reached for `Class.forName("DCourt.Screens." + launch)`, so this module
 * registers itself with the port's explicit launch table (see
 * `Control/ScreenRegistry.ts`); importing it is what makes the town reachable.
 */

import { COLORS, color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Portrait } from "../../ui/portrait";
import { type GameEvent } from "../../ui/widget";
import { registerScreenClass } from "../../Control/ScreenRegistry";
import { Tools } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";
import { arQuest } from "../Quest/arQuest";
import { WildsScreen } from "../Template/WildsScreen";
import { arCastle } from "../Wilds/arCastle";
import { arField } from "../Wilds/arField";
import type { itMonster } from "../../Items/List/itMonster";
import { arArmour } from "./Town/arArmour";
import { arTavern } from "./Town/arTavern";
import { arTrader } from "./Town/arTrader";
import { arWeapon } from "./Town/arWeapon";

export class arTown extends Screen {
  constructor() {
    super("Welcome to Salamander Township");
    this.setBackground(color(0, 255, 255));
    this.setForeground(COLORS.red);
    this.addPic(new Portrait("Tavern.jpg", "Tavern", 10, 60, 96, 64));
    this.addPic(new Portrait("Weapon.jpg", "Weapons", 160, 40, 96, 64));
    this.addPic(new Portrait("twnArmour.jpg", "Armour", 30, 170, 96, 64));
    this.addPic(new Portrait("toCastle.jpg", "Castle Gate", Tools.DEFAULT_HEIGHT, 20, 96, 64));
    this.addPic(new Portrait("twnTrader.jpg", "Trade Shop", 150, 180, 96, 64));
    this.addPic(new Portrait("toFields.jpg", "Leave Town", 280, 150, 96, 64));
  }

  override init(): void {
    super.init();
    /* Java: getPic(3).show(hero level >= 6) - the castle gate portrait is hidden
     * from low level heroes by `.show(false)`. */
    this.getPic(3)?.show(Screen.getHero().getLevel() >= 6);
    Screen.getHero().tryToLevel(this);
  }

  override action(e: GameEvent, o?: unknown): boolean {
    let next: Screen | null = null;
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.getPic(0)) {
      next = new arTavern(this);
    } else if (e.target === this.getPic(1)) {
      next = new arWeapon(this);
    } else if (e.target === this.getPic(2)) {
      next = new arArmour(this);
    } else if (e.target === this.getPic(3)) {
      next = this.enterCastle();
    } else if (e.target === this.getPic(4)) {
      next = new arTrader(this);
    } else if (e.target === this.getPic(5)) {
      next = new arField();
    }
    Tools.setRegion(next);
    return super.action(e, o);
  }

  /** Java `arTown.enterCastle()`. */
  enterCastle(): Screen {
    const h = Screen.getHero();
    return h.getSocial() > 0 || h.packCount("Castle Permit") > 0
      ? new arCastle()
      : h.getQuests() < 1
        ? new arNotice(this, WildsScreen.TOO_TIRED)
        : new arQuest(
            this,
            new arCastle(),
            3,
            "Castle Gate",
            Screen.findBeast("Town:Guard") as itMonster,
          );
  }
}

/* Java's `Class.forName("DCourt.Screens.Areas.arTown")` lookup. */
registerScreenClass("Areas.arTown", arTown);
