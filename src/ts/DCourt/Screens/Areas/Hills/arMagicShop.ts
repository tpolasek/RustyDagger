/**
 * arMagicShop - the DOM port of `DCourt.Screens.Areas.Hills.arMagicShop`
 * (Java: `Djinni's Ethereal Magic Shop`).
 *
 * A `Trade` shop whose stock is the scroll/potion list; its buy list merges
 * the two `GearTable` "Buy" groups and its stock value is doubled.
 */

import { Tools } from "../../../Tools/Tools";
import { GearTable } from "../../../Control/GearTable";
import { GearTypes } from "../../../Static/GearTypes";
import { Screen } from "../../../ui/screen";
import { Trade } from "../../Template/Trade";
import { Item } from "../../../Items/Item";
import { itList } from "../../../Items/itList";

/** Java `arMagicShop.greeting`. */
const greeting: string[] = [
  "",
  "Greetings Master",
  "You Wish is My Command",
  "How May I Serve Thee?",
  "Do Not Anger Me",
  "Seek and Ye Shall Find",
  "Try Blinding Trolls",
  "Seltzer Cleans Dust",
  "Never Ask A Girls Age",
];

/** Java `arMagicShop.stock`. */
const stock: string[] = [
  "Identify Scroll",
  "Glow Scroll",
  GearTypes.SALVE,
  GearTypes.SELTZER,
  GearTypes.PANIC_DUST,
  "Gold Apple",
  GearTypes.BLIND_DUST,
  "Bless Scroll",
  "Luck Scroll",
  "Enchant Scroll",
  "Flame Scroll",
  "Faceless Potion",
];

export class arMagicShop extends Trade {
  constructor(from: Screen | null) {
    super(from, "Djinni's Ethereal Magic Shop");
    this.setShopValues(55, 22);
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Djinni.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? Tools.getBest() + " Is Dreeeamy*" : msg;
  }

  /** Java `getStockList()`. */
  override getStockList(): string[] {
    return stock;
  }

  /** Java `getBuyList()`. */
  override getBuyList(): itList {
    const list = GearTable.findList("Buy", 6);
    list.merge(GearTable.findList("", 7));
    return list;
  }

  /** Java `getSpecial()`. */
  override getSpecial(): string | null {
    return null;
  }

  /** Java `doSpecial()`. */
  override doSpecial(): void {}

  /** Java `costSpecial()`. */
  override costSpecial(): number {
    return 0;
  }

  /** Java `stockValue(Item)`. */
  override stockValue(it: Item): number {
    return super.stockValue(it) * 2;
  }
}
