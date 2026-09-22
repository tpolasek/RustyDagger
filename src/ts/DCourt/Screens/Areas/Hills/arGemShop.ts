/**
 * arGemShop - the DOM port of `DCourt.Screens.Areas.Hills.arGemShop`
 * (Java: `Gakthrak Cunning's Priceless Gems`).
 *
 * A `Trade` shop selling gems, with a separate "Peer $250" button that opens
 * the `arPeer` gem-vision screen.  The Shop special (`getSpecial`/`doSpecial`/
 * `costSpecial`) is wired as in Java, that is both the Shop-provided special
 * control and the explicit `peer` button exist.
 */

import { Tools } from "../../../Tools/Tools";
import { GearTable } from "../../../Control/GearTable";
import { Screen } from "../../../ui/screen";
import { Button } from "../../../ui/button";
import { Trade } from "../../Template/Trade";
import { arPeer } from "../../Utility/arPeer";
import { itList } from "../../../Items/itList";

/** Java `arGemShop.greeting`. */
const greeting: string[] = [
  "",
  "Unhh...",
  "Hunh...",
  "Hargh..",
  "Eh?",
  "Enh..",
  "Hmm?",
  "Hrmm...",
  "Heh, Heh..",
  "Skrechk! Phtoo!",
];

/** Java `arGemShop.stock`. */
const stock: string[] = ["Quartz", "Opal", "Garnet", "Emerald", "Ruby", "Turquoise"];

export class arGemShop extends Trade {
  private peer!: Button;

  constructor(from: Screen | null) {
    super(from, "Gakthrak Cunning's Priceless Gems");
    this.setShopValues(70, 30);
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Gakthrak.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? Tools.getBest() + " heh, heh" : msg;
  }

  /** Java `createTools()`. */
  override createTools(): void {
    super.createTools();
    this.peer = new Button("Peer $250");
    this.peer.reshape(10, 242, 90, 20);
    this.peer.setFont(Tools.textF);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.peer);
  }

  /** Java `getStockList()`. */
  override getStockList(): string[] {
    return stock;
  }

  /** Java `getBuyList()`. */
  override getBuyList(): itList {
    return GearTable.findList("Buy", 4);
  }

  /** Java `getSpecial()`. */
  override getSpecial(): string {
    return "Peer";
  }

  /** Java `doSpecial()`. */
  override doSpecial(): void {
    Tools.setRegion(new arPeer(this, 1, null));
  }

  /** Java `costSpecial()`. */
  override costSpecial(): number {
    return 250;
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    super.localPaint();
    this.peer.enable(Screen.getHero().getMoney() >= 250);
  }
}
