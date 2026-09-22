/**
 * Port of `DCourt/Screens/Areas/Town/arWeapon.java` - Bill Smith's Weapon
 * Shoppe.  Everything shop-related lives in `Template/Smith`; this screen only
 * supplies the face, greetings, stock list, the "Identify" special and the
 * arms-specific resale value.
 */

import { Screen } from "../../../ui/screen";
import { Smith } from "../../Template/Smith";
import { Tools } from "../../../Tools/Tools";
import { ArmsTrait } from "../../../Static/ArmsTrait";
import { Item } from "../../../Items/Item";
import { itArms } from "../../../Items/List/itArms";

/** Java `(float) val * 1.3f` keeps single precision: 10 * 1.3f == 12.999999... -> 12. */
const RESALE_GAIN = Math.fround(1.3);

export class arWeapon extends Smith {
  /**
   * Java `arWeapon.greeting`; index 0 is the fallback slot (Java's null entry,
   * see `arQueen.greeting`).
   */
  static readonly greeting: string[] = [
    "",
    "Welcome to my Shop",
    "Greetings Friend",
    "Buy something sharp",
    "You think Aileen's cute?",
    "Elf Bows are fast",
    "Gonna sell something?",
    "See you at the Tavern",
    "How are you today?",
    "My joints are aching",
    "Want to arm wrestle?",
  ];
  static readonly stock: string[] = [
    "Knife",
    "Hatchet",
    "Short Sword",
    "Long Sword",
    "Spear",
    "Broad Sword",
    "Battle Axe",
    "Pike",
    "Sling",
    "Short Bow",
    "Long Bow",
    "Spike Helm",
    "Main Gauche",
  ];

  constructor(from: Screen | null) {
    super(from, "Bill Smith's Weapon Shoppe");
    this.setShopValues(60, 10);
  }

  override getFace(): string {
    return "Faces/Bill.jpg";
  }

  override getGreeting(): string {
    const msg = Tools.select(arWeapon.greeting);
    return msg.length === 0 ? `${Tools.getBest()} is strong...` : msg;
  }

  protected override getStockList(): string[] {
    return arWeapon.stock;
  }

  override getSpecial(): string {
    return "Identify";
  }

  override doSpecial(): void {
    this.doIdentify();
  }

  override costSpecial(): number {
    const a = this.shopFind() as itArms | null;
    return a == null || !a.hasTrait(ArmsTrait.SECRET) ? 0 : 40;
  }

  override stockValue(it: Item | null): number {
    if (!(it instanceof itArms)) {
      return 0;
    }
    let val = it.stockValue();
    if (it.hasTrait(ArmsTrait.RIGHT)) {
      val = Math.trunc(Math.fround(Math.fround(val) * RESALE_GAIN));
    }
    if (val < 2) {
      return 2;
    }
    return val;
  }
}
