/**
 * arDetail - the DOM port of `DCourt.Screens.Utility.arDetail`.
 *
 * The "Info" popup behind `arStatus` / shops: an `arNotice` whose text is the
 * `typeString` blurb of a plain item, the letter body of an `itNote`, or the
 * full armament breakdown (slots, attack/defense/skill, other traits, enchant
 * strength) of an `itArms`.
 *
 * The Java logic is preserved verbatim, including the two Smith/Armor perks that
 * strip the `Secret` trait from equipment the hero is qualified to identify and
 * the trailing `\n` of the "Other: NONE" case.
 */

import { GearTable } from "../../Control/GearTable";
import { Item } from "../../Items/Item";
import { itArms } from "../../Items/List/itArms";
import { itNote } from "../../Items/List/itNote";
import { itCount } from "../../Items/Token/itCount";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { Screen } from "../../ui/screen";
import { arNotice } from "./arNotice";

export class arDetail extends arNotice {
  /** Java `arDetail.typeString` - indexed by `GearTable.getType`. */
  static readonly typeString: string[] = [
    "Junk\n\tDitch it\n",
    "Map\n\tAllows Access to Region\n",
    "Camp Gear\n\tImproves Outdoor Camping\n",
    "Gear\n\tCommon Adventure Supplies\n",
    "Treasure\n\tSell it for money",
    "Treasure\n\tMay be used by Mages\n",
    "Magic\n\tAffect Hero + Monsters\n",
    "Magic\n\tAffects Armaments\n",
    "Special\n\tAdvanced Adventuring Supplies\n",
    "Money\n\tThis is what you spend in shops",
  ];

  constructor(from: Screen | null, it: Item) {
    // Java's `super(from, "Equipment Detail")` stores that string as the
    // message; the next line replaces it with the real detail text.
    super(from, "Equipment Detail");
    this.setMessage(this.detail(it));
  }

  /** Java `detail(Item)`. */
  detail(it: Item): string {
    return it instanceof itArms
      ? this.armsDetail(it)
      : it instanceof itCount
        ? this.countDetail(it)
        : it instanceof itNote
          ? this.noteDetail(it)
          : "No Information";
  }

  /** Java `countDetail(itCount)`. */
  countDetail(it: itCount): string {
    return `${it.getName()}[${it.getCount()}]\n\n\t${arDetail.typeString[GearTable.getType(it)]}`;
  }

  /** Java `noteDetail(itNote)`. */
  noteDetail(it: itNote): string {
    return `${it.getName()}: ${it.getFrom()}\nSent: ${it.getDate()}\n====================\n${it.getBody()}`;
  }

  /** Java `armsDetail(itArms)`. */
  armsDetail(a: itArms): string {
    if (a.hasTrait(ArmsTrait.SECRET)) {
      if (
        Screen.hasTrait(Constants.SMITH) &&
        (a.hasTrait(ArmsTrait.RIGHT) || a.hasTrait(ArmsTrait.LEFT))
      ) {
        a.clrTrait(ArmsTrait.SECRET);
      }
      if (
        Screen.hasTrait(Constants.ARMOR) &&
        (a.hasTrait(ArmsTrait.HEAD) ||
          a.hasTrait(ArmsTrait.BODY) ||
          a.hasTrait(ArmsTrait.FEET))
      ) {
        a.clrTrait(ArmsTrait.SECRET);
      }
    }
    let msg = a.toShow().concat("\n\n\tArmament\n\tLoc:");
    let none = true;
    for (let ix = 0; ix < ArmsTrait.END_WEAR_TRAIT; ix++) {
      if (a.hasTrait(ArmsTrait.traitLabel[ix]!)) {
        msg = msg.concat(" ".concat(ArmsTrait.traitLabel[ix]!));
        none = false;
      }
    }
    if (none) {
      msg = msg.concat(" NONE");
    }
    if (a.hasTrait(ArmsTrait.SECRET)) {
      return msg.concat("\n\n\tNot Identified\n");
    }
    let msg2 = msg.concat("\n");
    const num = a.getAttack();
    if (num !== 0) {
      msg2 = msg2.concat(`\t${num < 1 ? "" : "+"}${num} Attack\n`);
    }
    const num2 = a.getDefend();
    if (num2 !== 0) {
      msg2 = msg2.concat(`\t${num2 < 1 ? "" : "+"}${num2} Defense\n`);
    }
    const num3 = a.getSkill();
    if (num3 !== 0) {
      msg2 = msg2.concat(`\t${num3 < 1 ? "" : "+"}${num3} Skill\n`);
    }
    let msg3 = msg2.concat("\n\tOther:");
    let none2 = true;
    for (let ix = ArmsTrait.VISIBLE_TRAIT; ix < ArmsTrait.traitLabel.length; ix++) {
      if (a.hasTrait(ArmsTrait.traitLabel[ix]!)) {
        msg3 = msg3.concat("\n\t\t".concat(ArmsTrait.traitLabel[ix]!));
        if (ix === ArmsTrait.ENCHANT_TRAIT) {
          msg3 = msg3.concat(this.enchantStrength(a.getPower(), a.getCount(ArmsTrait.ENCHANT)));
        }
        none2 = false;
      }
    }
    if (none2) {
      msg3 = msg3.concat("\n\t\tNONE\n");
    }
    return msg3;
  }

  /** Java `enchantStrength(int power, int spell)`. */
  enchantStrength(power: number, spell: number): string {
    return spell < Math.trunc(power / 2) ? " Weak\n" : spell < power ? " Good\n" : " Strong\n";
  }
}
