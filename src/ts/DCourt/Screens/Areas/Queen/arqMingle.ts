/**
 * Port of `DCourt/Screens/Areas/Queen/arqMingle.java` - mingling with the court
 * nobles.  Note the Java quirk kept as-is: `Tools.fourTest(...)` is rolled twice
 * (once for the narrative, once for the effect), so the text and the reward do
 * not always agree.
 */

import { Screen } from "../../../ui/screen";
import { arNotice } from "../../Utility/arNotice";
import { arQueen } from "../arQueen";
import { Tools } from "../../../Tools/Tools";
import { MadLib } from "../../../Tools/MadLib";
import { Constants } from "../../../Static/Constants";
import { GameStrings } from "../../../Static/GameStrings";

export class arqMingle extends arNotice {
  static readonly MINGLERISK = 5;

  static readonly mingleMsg = "$TB$You engange $lordname$ in conversation. $interests$$CR$";
  static readonly mingleText: string[] = [
    "$TB$Five minutes pass while you describe your bladder problems to $lordname$.  $HE$ smiles in a strained fashion and takes $his$ leave as soon as possible.$CR$$TB$Perhaps you could have been a little more attentive.$CR$",
    "$TB$The $lordrank$ is a terrific conversationalist. $HE$ smiles and nods for several minutes while you speak at some length about your adventures and aspirations.$CR$$TB$You part company thinking that you have made great success with ... uh ... what was $his$ name again? $CR$",
    "$TB$You exchange friendly banter with the noble for several minutes.  You fail to find any topic of common interest and thus part ways a short time later.$CR$$TB$Well, at least you have offended noone.$CR$",
    "$TB$You listen attentively while $lordname$ describes $HIS$ pursuits.  You nod and smile at all the appropriate points during $HIS$ stories.$CR$$TB$The $lordrank$ is favorably impressed by your intelligence and acumen.  $HE$ invites you to come visit at $HIS$ estates sometime.$CR$$TB$You have won another friend in the Dragon Court.$CR$",
    "$TB$You listen with grave attention as the $lordrank$ describes $his$ pursuits.  You wax enthusiastic and make knowledgable comments on the topic.$CR$$TB$ $lordname$ thanks you for the delightful conversation and expresses interest in your future career. You have earned yourself a staunch ally in the Dragon Court.$CR$",
  ];

  constructor(from: Screen | null) {
    super(from, arqMingle.prepareText());
  }

  /** Java `arqMingle.prepareText()`. */
  static prepareText(): string {
    const h = Screen.getHero();
    let rank = 1 + Tools.roll(2 + h.getSocial());
    if (rank > 10) {
      rank = 10;
    }
    const level = rank * 2 + Tools.roll(rank * 2);
    const skill = h.getCharm() + h.magic() * 5;
    const favor = h.getFavor();
    h.addFatigue(1);
    const msg = new MadLib(
      arqMingle.mingleMsg.concat(
        arqMingle.mingleText[Tools.fourTest(skill, level * arqMingle.MINGLERISK)],
      ),
    );
    /* Java rolled `fourTest` a second time here (not the value used above). */
    switch (Tools.fourTest(skill, level * arqMingle.MINGLERISK)) {
      case 0:
        h.subFavor(Math.trunc(favor / (14 - rank)));
        break;
      case 1:
        h.subFavor(Math.trunc(favor / (17 - rank)));
        break;
      case 2:
        msg.append(h.gainExp(rank + level));
        msg.append(h.gainCharm(4));
        break;
      case 3:
        msg.append(h.gainExp(rank * 2 + level));
        msg.append(h.gainCharm(7));
        h.addFavor(Math.trunc(favor / (17 - rank)));
        break;
      case 4:
        msg.append(h.gainExp(rank * 5 + level));
        msg.append(h.gainCharm(10));
        h.addFavor(Math.trunc(favor / (14 - rank)));
        break;
    }
    msg.append(arQueen.Recommend());
    msg.replace(
      "$lordname$",
      `${Constants.rankTitle[rank]}${Tools.select(GameStrings.Names)}`,
    );
    const sex = Tools.roll(2);
    msg.replace("$lordrank$", Constants.rankName[sex][rank]);
    msg.replace("$interests$", Tools.select(GameStrings.interests));
    msg.genderize(sex === 0);
    return msg.getText();
  }
}
