/**
 * Port of `DCourt/Screens/Areas/Queen/arqDice.java` - a friendly (and possibly
 * rigged) game of bones with a court noble.
 *
 * Java called the static `prepareText()` from the `super(...)` argument, so the
 * whole game - rolls, money and text - is resolved before the notice screen
 * exists.
 */

import { Screen } from "../../../ui/screen";
import { arNotice } from "../../Utility/arNotice";
import { arQueen } from "../arQueen";
import { Tools } from "../../../Tools/Tools";
import { MadLib } from "../../../Tools/MadLib";
import { Constants } from "../../../Static/Constants";
import { GameStrings } from "../../../Static/GameStrings";

export class arqDice extends arNotice {
  static readonly swapMsg = "$TB$(You surreptitiously swap dice)$CR$";
  static readonly guildSign = "$TB$($lordname$ flashes the trade guild hand-sign)$CR$";
  static readonly diceMsg =
    "$TB$You engage $lordname$ in a friendly game of bones.  $HE$ wants to make things 'interesting' by wagering the small sum of $bet$ marks.  You gulp and smile bravely, then grab for the dice.$CR$";
  static readonly diceText: string[] = [
    "$TB$A short time later, you are handing over a full purse of money to the gloating $lordrank$.  $HE$ slaps you on the back and shakes your hand. You may have lost, but you have gained a friend.$CR$",
    "$TB$You dice with great care, but lose steadily. Soon, you shake your head and cut your losses at $cost$ marks.  $lordname$ smiles broadly and offers to play again in the future.$CR$",
    "$TB$You dice with gay abandon.  At the end, you and the $lordrank$ break even.  $HE$ thanks you for the friendly game.$CR$",
    "$TB$You dice with good success. $lordname$ smiles wanly as you take half $HIS$ money.$CR$",
    "$TB$A short time later, you are adding a fat purse to your possessions.  It is the $lordrank$'s turn to smile bravely.$CR$",
  ];

  constructor(from: Screen | null) {
    super(from, arqDice.prepareText());
  }

  /** Java `arqDice.prepareText()` - plays the game and returns the result text. */
  static prepareText(): string {
    const h = Screen.getHero();
    let rank = 1 + Math.trunc(h.getMoney() / 25000) + Tools.roll(3);
    if (rank > 10) {
      rank = 10;
    }
    const level = rank * 2 + Tools.roll(rank * 2);
    const thief = Tools.roll(2) === 0 ? 0 : Tools.roll(level);
    let dskill = level * 8;
    let cost = 2500 * (rank + 1);
    if (cost > h.getMoney()) {
      cost = h.getMoney();
    }
    let pskill = h.getWits();
    const favor = h.getFavor();
    h.addFatigue(1);
    const msg = new MadLib(arqDice.diceMsg);
    const swap = Tools.contest(h.thief(), thief);
    if (!swap) {
      dskill += thief * 5;
    } else {
      msg.append(arqDice.swapMsg);
      pskill += h.thief() * 5;
    }
    const index = Tools.fourTest(pskill, dskill);
    msg.append(arqDice.diceText[index]);
    switch (index) {
      case 0:
        h.subMoney(cost);
        h.addFavor(Math.trunc(favor / (20 - rank)));
        break;
      case 1:
        msg.replace("$cost$", Math.trunc(cost / 2));
        h.subMoney(Math.trunc(cost / 2));
        h.addFavor(Math.trunc(favor / (30 - rank)));
        break;
      case 2:
        msg.append(h.gainExp(rank + thief + level));
        msg.append(h.gainWits(4));
        h.addFavor(Math.trunc(favor / (40 - rank)));
        break;
      case 3:
        h.addMoney(Math.trunc(cost / 2));
        msg.append(h.gainExp((rank + thief) * 2 + level));
        msg.append(h.gainWits(7));
        h.subFavor(Math.trunc(favor / (30 - rank)));
        break;
      case 4:
        h.addMoney(cost);
        msg.append(h.gainExp((rank + thief) * 5 + level));
        msg.append(h.gainWits(10));
        h.subFavor(Math.trunc(favor / (20 - rank)));
        break;
    }
    if (!swap && h.thief() > 0 && thief > 0) {
      msg.append(arqDice.guildSign);
    }
    msg.append(arQueen.Recommend());
    msg.replace(
      "$lordname$",
      `${Constants.rankTitle[rank]}${Tools.select(GameStrings.Names)}`,
    );
    const sex = Tools.roll(2);
    msg.replace("$lordrank$", Constants.rankName[sex][rank]);
    msg.replace("$bet$", cost);
    msg.genderize(sex === 0);
    return msg.getText();
  }
}
