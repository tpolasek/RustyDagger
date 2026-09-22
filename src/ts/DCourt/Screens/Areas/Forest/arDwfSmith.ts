/**
 * arDwfSmith - the DOM port of `DCourt.Screens.Areas.Forest.arDwfSmith`
 * (Java: `Gareth Shortleg's Forest Smithy`).
 *
 * A `Smith` shop: the stock list and stock-value rules (left-handed weapons
 * cost x1.3, minimum 2) plus the "Identify" secret-unveiling special are kept;
 * `Smith` supplies the buy/sell transaction and table chrome.
 */

import { Tools } from "../../../Tools/Tools";
import { ArmsTrait } from "../../../Static/ArmsTrait";
import { Screen } from "../../../ui/screen";
import { Smith } from "../../Template/Smith";
import { Item } from "../../../Items/Item";
import { itArms } from "../../../Items/List/itArms";

/** Java `arDwfSmith.greeting`. */
const greeting: string[] = [
  "",
  "What the hell you want?",
  "Think as you're tough?",
  "Sod off ye bugger!",
  "What now!",
  "Well, piss on me",
  "Fargin' hell!",
  "Acch! What is it?",
  "Shades! Go away!",
  "This is me finest work",
  "A dandy bit this is",
  "Here's a pretty piece",
  "This is art, laddy",
  "Mithril is crap!",
  "I spit on Mithril",
  "Elf Bows? Bah!",
  "Gak! I hate Elf Bows!",
  "REPAIR!? Smeg off!",
  "FIX IT!? Yure Nuts!",
  "POLISH!? I'm no serf!",
];

/** Java `arDwfSmith.stock`. */
const stock: string[] = [
  "Steel Sword",
  "Bill Hook",
  "Sword Breaker",
  "Shakrum",
  "Recurve Bow",
  "Half Plate",
  "Full Plate",
  "Steel Buckler",
  "Roman Helm",
  "Doc Martins",
  "Mercury Sandals",
];

export class arDwfSmith extends Smith {
  constructor(from: Screen | null) {
    super(from, "Gareth Shortleg's Forest Smithy");
    this.setShopValues(50, 20);
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Gareth.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? "You're no " + Tools.getBest() : msg;
  }

  /** Java `getStockList()`. */
  override getStockList(): string[] {
    return stock;
  }

  /** Java `stockValue(Item)`. */
  override stockValue(it: Item): number {
    if (!(it instanceof itArms)) return 0;
    const arm = it;
    let val = arm.stockValue();
    if (arm.hasTrait(ArmsTrait.LEFT)) val = Math.trunc(val * 1.3);
    if (val < 2) return 2;
    return val;
  }

  /** Java `doSpecial()`. */
  override doSpecial(): void {
    this.doIdentify();
  }

  /** Java `getSpecial()`. */
  override getSpecial(): string {
    return "Identify";
  }

  /** Java `costSpecial()`. */
  override costSpecial(): number {
    const arm = this.shopFind() as itArms | null;
    return arm === null || !arm.hasTrait(ArmsTrait.SECRET) ? 0 : 60;
  }
}
