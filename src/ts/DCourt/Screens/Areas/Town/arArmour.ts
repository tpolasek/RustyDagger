/**
 * Port of `DCourt/Screens/Areas/Town/arArmour.java` - Aileen Suitor's Armour
 * Shoppe, plus the "Polish" special that repairs battle-worn (`Decay`) armour
 * back up to its catalogue stats.
 */

import { Screen } from "../../../ui/screen";
import { Smith } from "../../Template/Smith";
import { Tools } from "../../../Tools/Tools";
import { ArmsTrait } from "../../../Static/ArmsTrait";
import { ArmsTable } from "../../../Control/ArmsTable";
import { Item } from "../../../Items/Item";
import { itArms } from "../../../Items/List/itArms";

/** Java `(float) val * 1.3f` keeps single precision: 10 * 1.3f == 12.999999... -> 12. */
const RESALE_GAIN = Math.fround(1.3);

export class arArmour extends Smith {
  static readonly MAXFIX_POWER = 60;

  /**
   * Java `arArmour.greeting`; index 0 is the fallback slot (Java's null entry,
   * see `arQueen.greeting`).
   */
  static readonly greeting: string[] = [
    "",
    "What's your sign?",
    "Hiya Sonny!",
    "Watcha Got?",
    "Hey there, sexy",
    "Rub me feet, willya?",
    "Armour is good...",
    "C'mon sexy, smile",
    "Cover ever'thing",
    "Back fer more?",
    "Need some shoes?",
  ];
  static readonly stock: string[] = [
    "Clothes",
    "Leather Jacket",
    "Brigandine",
    "Chain Suit",
    "Scale Suit",
    "Buckler",
    "Targe",
    "Shield",
    "Spike Shield",
    "Sandals",
    "Shoes",
    "Boots",
    "Leather Cap",
    "Pot Helm",
    "Chain Coif",
  ];

  constructor(from: Screen | null) {
    super(from, "Aileen Suitor's Armour Shoppe");
    this.setShopValues(50, 15);
  }

  override getFace(): string {
    return "Faces/Aileen.jpg";
  }

  override getGreeting(): string {
    const val = Tools.select(arArmour.greeting);
    return val.length === 0 ? `${Tools.getBest()} is my hero.` : val;
  }

  protected override getStockList(): string[] {
    return arArmour.stock;
  }

  override getSpecial(): string {
    return "Polish";
  }

  override doSpecial(): void {
    const h = Screen.getHero();
    const arm = this.shopFind() as itArms | null;
    /* Java short-circuited on the item test before calling `costSpecial()`. */
    if (arm == null || arm.hasTrait(ArmsTrait.SECRET)) {
      return;
    }
    const cost = this.costSpecial();
    if (h.getMoney() < cost) {
      return;
    }
    h.subMoney(cost);
    arm.clrTrait(ArmsTrait.DECAY);
    if (cost >= 2) {
      const base = ArmsTable.get(arm);
      if (base != null) {
        if (base.getAttack() > arm.getAttack()) {
          arm.setAttack(base.getAttack());
        }
        if (base.getDefend() > arm.getDefend()) {
          arm.setDefend(base.getDefend());
        }
        if (base.getSkill() > arm.getSkill()) {
          arm.setSkill(base.getSkill());
        }
      }
      this.getTable().setItem(this.shopName(arm), this.getTable().getSelect());
    }
  }

  override costSpecial(): number {
    const arm = this.shopFind() as itArms | null;
    if (arm == null || arm.hasTrait(ArmsTrait.SECRET)) {
      return 0;
    }
    const base = ArmsTable.get(arm);
    let cost = arm.hasTrait(ArmsTrait.DECAY) ? 1 : 0;
    if (base == null || base.getPower() >= arArmour.MAXFIX_POWER) {
      return cost;
    }
    const num = base.getAttack() - arm.getAttack();
    if (num > 0) {
      cost += num * num * 5;
    }
    const num2 = base.getDefend() - arm.getDefend();
    if (num2 > 0) {
      cost += num2 * num2 * 4;
    }
    const num3 = base.getSkill() - arm.getSkill();
    if (num3 > 0) {
      cost += num3 * num3 * 2;
    }
    return cost;
  }

  override stockValue(it: Item | null): number {
    if (!(it instanceof itArms)) {
      return 0;
    }
    let val = it.stockValue();
    if (it.hasTrait(ArmsTrait.BODY)) {
      val = Math.trunc(Math.fround(Math.fround(val) * RESALE_GAIN));
    }
    if (val < 2) {
      return 2;
    }
    return val;
  }
}
