/**
 * arExit - the DOM port of `DCourt.Screens.Command.arExit`.
 *
 * Java's "go to sleep / you died" screen: `arExit extends arNotice`, so it is a
 * black screen of text that advances on a click - `down()` first saves the hero
 * (`saveAdvance()` -> `arFinish`, or the Player's error screen) and then falls
 * through to the inherited click handling.
 *
 * Port notes:
 *  - the constructor still runs the Java sequence: `setPlace(loc)`, the death
 *    branch (`dead()`), or the place table's sleep text decorated with the
 *    camping gear the hero carries and the remaining quests;
 *  - `use.indexOf(<char code>)` is ported as `indexOf("c")` etc.;
 *  - `arNotice` is a sibling screen port (Utility group) that this class
 *    extends; `setMessage`/`down` are its Java public API.
 */

import { Screen } from "../../ui/screen";
import { MadLib } from "../../Tools/MadLib";
import { Tools } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";
import { arFinish } from "./arFinish";

/** Java `arExit.deadMsg` (the `$TB$`/`$CR$` tokens are expanded by `MadLib`). */
const deadMsg =
  "$TB$Whoops! you have been killed!!!$CR$$TB$The creature steals half your gear...$CR$$CR$You fall to the ground in the $place$. You will lie there unmourned until tomorrow when the spirits of the $place$ will awaken you.$CR$$CR$$TB$$TB$Please Return Tomorrow$CR$$TB$$TB$For Further Adventures$CR$";

export class arExit extends arNotice {
  /** Java `boolean saveSuccess` (declared, never read in the Java source). */
  private saveSuccess = false;

  /** Java `arExit(Screen from, String loc)`. */
  constructor(from: Screen | null, loc: string) {
    super(from, "arExit");
    Screen.setPlace(loc);
    const player = Screen.getPlayer();
    if (player.isDead()) {
      this.setMessage(this.dead());
      return;
    }
    const lot = Tools.getPlaceTable();
    if (lot === null) {
      // Java dereferenced the place table without a check; say so instead of throwing.
      this.setMessage("Serious Error: the place table has not been loaded.\n");
      return;
    }
    lot.select(loc);
    let msg = String(lot.getSleep());
    const use = String(lot.getUse());
    if (use.indexOf("c") >= 0 && Screen.packCount("Cooking Gear") > 0) {
      msg = msg.concat("\tYou cook up a hearty dinner.\n");
    }
    if (use.indexOf("t") >= 0 && Screen.packCount("Camp Tent") > 0) {
      msg = msg.concat("\tYou prepare a tent for shelter.\n");
    }
    if (use.indexOf("b") >= 0 && Screen.packCount("Sleeping Bag") > 0) {
      msg = msg.concat("\tYou roll up in a sleeping bag.\n");
    }
    this.setMessage(msg.concat(this.questsRemain()));
  }

  /** Java `down(int x, int y)`: save the hero, then let `arNotice` finish. */
  override down(_x: number, _y: number): Screen | null {
    if (this.movedAway()) {
      return null;
    }
    this.saveAdvance();
    return null;
  }

  /** Java `saveAdvance()`. */
  saveAdvance(): void {
    const player = Screen.getPlayer();
    if (player.saveHero()) {
      player.saveScore();
      Tools.setRegion(new arFinish());
      return;
    }
    Tools.setRegion(player.errorScreen(this.getHome()));
  }

  /** Java `dead()`: the death notice, with the hero exhausted for the day. */
  dead(): string {
    const mad = new MadLib(deadMsg);
    mad.replace("$place$", String(Screen.getHero().getPlace()));
    Screen.getHero().doExhaust();
    return mad.getText();
  }

  /** Java `questsRemain()`. */
  questsRemain(): string {
    const qnum = Screen.getQuests();
    return qnum > 0
      ? `\n\n\t${qnum} Quests Remain for Today...\n`
      : "\n\n\tReturn Tomorrow for Further Quests...\n";
  }
}
