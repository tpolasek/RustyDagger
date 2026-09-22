/**
 * Port of `DCourt/Screens/Areas/Town/arTrader.java` - Sally Trader's Curious
 * Goods (the general supply shop).
 */

import { Screen } from "../../../ui/screen";
import { Trade } from "../../Template/Trade";
import { Tools } from "../../../Tools/Tools";
import { GearTypes } from "../../../Static/GearTypes";

export class arTrader extends Trade {
  /**
   * Java `arTrader.greeting`; index 0 is the fallback slot (Java's null entry,
   * see `arQueen.greeting`).
   */
  static readonly greeting: string[] = [
    "",
    "Hello Again",
    "How are you?",
    "Nice weather today",
    "How's the family?",
    "You look healthy",
    "Need something special?",
    "Aileen scares me",
    "The tavern is noisy",
    "Need some help?",
    "Want a kiss?",
  ];
  static readonly stock: string[] = [
    GearTypes.FOOD,
    GearTypes.FISH,
    "Torch",
    "Rope",
    "Pen & Paper",
    "Sleeping Bag",
    "Cooking Gear",
    "Camp Tent",
    "Identify Scroll",
    GearTypes.SALVE,
    GearTypes.SELTZER,
    GearTypes.PANIC_DUST,
    GearTypes.BLIND_DUST,
    GearTypes.PANIC_DUST,
    GearTypes.BLAST_DUST,
    "Castle Permit",
  ];

  constructor(from: Screen | null) {
    super(from, "Sally Trader's Curious Goods");
    this.setShopValues(80, 15);
  }

  override getFace(): string {
    return "Faces/Sally.jpg";
  }

  override getGreeting(): string {
    const msg = Tools.select(arTrader.greeting);
    return msg.length === 0 ? `I like ${Tools.getBest()}` : msg;
  }

  protected override getStockList(): string[] {
    return arTrader.stock;
  }
}
