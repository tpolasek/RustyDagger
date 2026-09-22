/**
 * Shop - the DOM rewrite of `DCourt.Screens.Template.Shop` (`Template/Shop.java`).
 *
 * Java: the abstract buy/sell screen shared by every shop (weapons, armour,
 * traders, gem/magic shops, the Gobble Inn, ...).  Every mechanic is ported
 * verbatim:
 *
 *  - Buy/Sell mode is a pair of radio boxes (`CheckboxGroup`);
 *  - the visible stock lives in an `FTextList` (the DOM port keeps the Java
 *    `addItem`/`setItem`/`delItem`/`setSelect` model, see ui/textList.ts);
 *  - `shopList`/`shopFind` map between list rows and `itList` entries through
 *    `discardItem`;
 *  - `packValue` is the sell price formula (`RESALE`/`BASE`/hero charm, with the
 *    Merchant trait shifting the 95/100 divisor);
 *  - `stockValue` is the buy price, overridden by Smith/Trade subclasses.
 *
 * Only `Screen.getPack()` needs a cast: the UI layer types the hero's lists
 * loosely (`ListLike`), while the shop works with the real `itList`.
 */

import { GearTable } from "../../Control/GearTable";
import { Item } from "../../Items/Item";
import { itArms } from "../../Items/List/itArms";
import { itCount } from "../../Items/Token/itCount";
import { itList } from "../../Items/itList";
import { Constants } from "../../Static/Constants";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { Checkbox, CheckboxGroup } from "../../ui/checkbox";
import { color, type ColorSpec } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import { FTextList } from "../../ui/textList";
import type { GameEvent } from "../../ui/widget";
import { arDetail } from "../Utility/arDetail";
import { Indoors } from "./Indoors";

export abstract class Shop extends Indoors {
  /** Java `static final int STOCK` / `PACK`. */
  static readonly STOCK = 0;
  static readonly PACK = 1;

  /** Java `public static final Color TABLE_COLOR`. */
  static readonly TABLE_COLOR: ColorSpec = color(64, 255, 192);

  protected RESALE: number = 0;
  protected BASE: number = 0;
  protected mode: number = 0;
  protected sellList: itList | null = null;
  protected buyList: itList | null = null;
  protected packList: itList | null = null;
  protected box: Checkbox[] = [];
  /** Java declared `FTextList table` unbounded; `createTools()` builds it. */
  protected table!: FTextList;
  protected group!: CheckboxGroup;
  protected info!: Button;
  protected special: Button | null = null;
  /** Java field initializer: read at construction, like the AWT original. */
  protected heroCharm: number = Number(Screen.getHero().getCharm());
  protected lastSelect: Item | null = null;

  /** Java `protected abstract String[] getStockList()`. */
  protected abstract getStockList(): string[] | null;

  /** Java `protected abstract boolean discardStock(Item item)`. */
  protected abstract discardStock(it: Item): boolean;

  /** Java `protected abstract boolean discardPack(Item item)`. */
  protected abstract discardPack(it: Item): boolean;

  /** Java `Shop(Screen from, String name)`; `mode` starts at STOCK. */
  constructor(from?: Screen | string | null, name?: string) {
    super(from, name);
    this.mode = 0;
  }

  /** Java `setShopValues(int rs, int bs)`. */
  setShopValues(rs: number, bs: number): void {
    this.RESALE = rs;
    this.BASE = bs;
  }

  /** Java `Shop.init()`: rebuild the widgets, then refill the visible list. */
  override init(): void {
    super.init();
    this.shopList(this.lastSelect);
  }

  /** Java `fixPicture(String face)`: shops that add their own portraits. */
  fixPicture(face: string): void {
    this.addPic(new Portrait("Exit.jpg", 320, 10, 64, 32));
    this.addPic(new Portrait(face, this.getGreeting(), 10, 30, 144, 192));
  }

  /** Java `Shop.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.getPic(0)) {
      Tools.setRegion(this.getHome());
    }
    if (e.target === this.box[0]) {
      this.setMode(0);
    }
    if (e.target === this.box[1]) {
      this.setMode(1);
    }
    if (e.target === this.info) {
      this.shopInfo();
    }
    if (e.target === this.table) {
      this.lastSelect = this.shopFind();
    }
    this.updateTools();
    this.repaint();
    return super.action(e, o);
  }

  /** Java `Shop.createTools()`. */
  override createTools(): void {
    this.table = new FTextList();
    this.table.reshape(162, 75, 230, 186);
    this.table.setFont(Tools.boldF);
    this.info = new Button("Info");
    this.info.reshape(110, 242, 40, 20);
    this.info.setFont(Tools.textF);
    this.group = new CheckboxGroup();
    this.box = [];
    this.sellList = this.getSellList();
    this.buyList = this.getBuyList();
    // The UI layer types the hero's lists loosely (`ListLike`); the shop needs
    // the real `itList`, just like Java's `Screen.getPack()`.
    this.packList = Screen.getPack() as itList | null;
    this.box[0] = new Checkbox("Buy", this.group, this.isStock());
    this.box[0].reshape(165, 28, 60, 20);
    this.box[0].setBackground(this.getBackground());
    this.box[1] = new Checkbox("Sell", this.group, this.isPack());
    this.box[1].reshape(240, 28, 60, 20);
    this.box[1].setBackground(this.getBackground());
    this.special = null;
    if (this.getSpecial() !== null) {
      // Java built the label as `getSpecial() + String.valueOf(0)`, i.e. "Identify0".
      this.special = new Button(`${this.getSpecial()}${0}`);
      this.special.setFont(Tools.textF);
      this.special.reshape(10, 242, 90, 20);
    }
  }

  /** Java `Shop.addTools()`. */
  override addTools(): void {
    this.add(this.table);
    this.add(this.box[0]);
    this.add(this.box[1]);
    this.add(this.info);
    if (this.special !== null) {
      this.add(this.special);
    }
  }

  /** Java `hideTools(int which)`. */
  hideTools(which: number): void {
    this.table.show(which !== 2);
    this.box[0].show(which === 0);
    this.box[1].show(which === 0);
    this.info.show(which !== 2);
    if (this.special !== null) {
      this.special.show(which !== 2);
    }
  }

  /** Java `updateTools()`: refresh the optional special button. */
  updateTools(): void {
    if (this.special !== null) {
      const cost = this.costSpecial();
      this.special.setLabel(`${this.getSpecial()} $${cost}`);
      this.special.enable(cost !== 0 && Number(Screen.getHero().getMoney()) >= cost);
    }
  }

  /** Java `setMode(int val)`. */
  setMode(val: number): void {
    this.mode = val;
    this.group.setCurrent(this.box[this.mode]);
    this.shopList(this.lastSelect);
  }

  /** Java `getMode()`. */
  getMode(): number {
    return this.mode;
  }

  /** Java `isStock()`. */
  isStock(): boolean {
    return this.mode === 0;
  }

  /** Java `isPack()`. */
  isPack(): boolean {
    return this.mode === 1;
  }

  /** Java `getModeList()`. */
  getModeList(): itList | null {
    return this.isStock() ? this.sellList : this.packList;
  }

  /** Java `getSpecial()`. */
  getSpecial(): string | null {
    return null;
  }

  /** Java `doSpecial()`. */
  doSpecial(): void {}

  /** Java `costSpecial()`. */
  costSpecial(): number {
    return 0;
  }

  /**
   * Java has two overloads:
   *   `shopList(String id)` finds the item by name first (via `Tools.truncate`),
   *   `shopList(Item find)` selects it by identity.
   * Both collapse into this method; the `null` case is the Item overload, which
   * is what `Shop.init()/setMode()` pass (`this.lastSelect`).
   */
  shopList(idOrItem: string | Item | null): void {
    const list = this.getModeList();
    if (list === null) {
      return;
    }
    if (typeof idOrItem === "string") {
      // `Tools.truncate` only returns null for a null input.
      this.fillShopList(list, list.find(Tools.truncate(idOrItem)!));
      return;
    }
    this.fillShopList(list, idOrItem);
  }

  /** Java `shopList(Item find)` body. */
  private fillShopList(list: itList, find: Item | null): void {
    this.table.clear();
    let px = 0;
    let pick = -1;
    for (let ix = 0; ix < list.getCount(); ix++) {
      const it = list.select(ix)!;
      if (!this.discardItem(it)) {
        this.table.addItem(this.shopName(it));
        if (it === find) {
          pick = px;
        }
        px++;
      }
    }
    this.table.setSelect(pick);
    this.lastSelect = find;
  }

  /** Java `Item shopFind()`: the item behind the selected row. */
  shopFind(): Item | null {
    let pick = this.table.getSelect();
    const list = this.getModeList()!;
    if (pick < 0) {
      return null;
    }
    for (let ix = 0; ix < list.getCount(); ix++) {
      const it = list.select(ix)!;
      if (!this.discardItem(it)) {
        pick--;
        if (pick < 0) {
          return it;
        }
      }
    }
    return null;
  }

  /** Java `void shopInfo()`. */
  private shopInfo(): void {
    const it = this.shopFind();
    if (it !== null) {
      Tools.setRegion(new arDetail(this, it));
    }
  }

  /** Java `shopName(Item it)`: the row label, price included. */
  shopName(it: Item): string {
    const msg =
      it instanceof itArms
        ? it.toShow()
        : `${it.getName()}(${Screen.packCount(it)})`;
    return this.isPack() ? `${msg} $${this.packValue(it)}` : `${msg} $${this.stockValue(it)}`;
  }

  /** Java `packValue(Item it)`: what the shop pays when the hero sells. */
  packValue(it: Item | null): number {
    const cost = this.stockValue(it);
    const cost2 = Screen.hasTrait(Constants.MERCHANT)
      ? Math.trunc((cost * this.RESALE) / 95)
      : Math.trunc((cost * this.RESALE) / 100);
    return cost2 - Math.trunc((cost2 * this.BASE) / (2 * this.BASE + this.heroCharm));
  }

  /**
   * Java `stockValue(Item it)`: `GearTable.getCost(it)`.
   *
   * Deviation: Java dereferenced `it` unconditionally, so `Smith.updateTools()`
   * threw a NullPointerException whenever the Sell list was empty (no arms in
   * the pack).  A null item is priced 0 here instead, which leaves the shop
   * usable (the Transact button stays disabled anyway).
   */
  stockValue(it: Item | null): number {
    return it === null ? 0 : GearTable.getCost(it);
  }

  /** Java `protected itList getSellList()`. */
  protected getSellList(): itList | null {
    return this.createSellList(this.getStockList());
  }

  /** Java `protected itList getBuyList()`. */
  protected getBuyList(): itList | null {
    return null;
  }

  /** Java `getTable()`. */
  getTable(): FTextList {
    return this.table;
  }

  /** Java `boolean discardItem(Item it)`. */
  private discardItem(it: Item): boolean {
    if (this.isStock()) {
      return this.discardStock(it);
    }
    if (!it.isMatch("Marks") && this.stockValue(it) >= 1 && !this.discardPack(it)) {
      return (
        this.sellList!.find(it.getName()) === null &&
        this.buyList !== null &&
        this.buyList.find(it.getName()) === null
      );
    }
    return true;
  }

  /** Java `protected itList createSellList(String[] stock)`. */
  protected createSellList(stock: string[] | null): itList | null {
    if (stock === null) {
      return null;
    }
    const result = new itList("Sell");
    for (let ix = 0; ix < stock.length; ix++) {
      if (GearTable.find(stock[ix])) {
        result.append(GearTable.shopItem(stock[ix]));
      }
    }
    return result;
  }

  /** Java `buyItem(int num)`. */
  buyItem(num: number): void {
    const h = Screen.getHero();
    const it = this.shopFind();
    if (it !== null) {
      const cost = this.stockValue(it);
      // Java performed `h.getMoney() / cost` (an ArithmeticException when cost
      // was 0); a zero-cost row buys nothing here instead of crashing the page.
      const val = cost < 1 ? 0 : Math.trunc(Number(h.getMoney()) / cost);
      if (num > val) {
        num = val;
      }
      if (num !== 0) {
        h.subMoney(cost * num);
        h.addPack(it.getName(), num);
        const ix = this.table.getSelect();
        this.table.setItem(this.shopName(it), ix);
      }
    }
  }

  /** Java `sellItem(int num)`. */
  sellItem(num: number): void {
    const h = Screen.getHero();
    const it = this.shopFind();
    const packList = this.packList!;
    if (it !== null) {
      const cost = this.packValue(it);
      const max = it.getCount();
      let num2: number;
      if (it instanceof itCount) {
        num2 = packList.sub(it.getName(), num);
      } else {
        num2 = 1;
        packList.drop(it);
      }
      h.addMoney(cost * num2);
      const ix = this.table.getSelect();
      if (num2 === max) {
        this.table.delItem(ix);
      } else {
        this.table.setItem(this.shopName(it), ix);
      }
    }
  }
}
