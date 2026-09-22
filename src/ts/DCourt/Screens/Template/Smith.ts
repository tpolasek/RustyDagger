/**
 * Smith - the DOM rewrite of `DCourt.Screens.Template.Smith`
 * (`Template/Smith.java`).
 *
 * Java: the arms-dealer shop variant.  It only trades `itArms` (`discardStock`/
 * `discardPack` reject anything else) and adds a single Transact button whose
 * label/state depends on the mode:
 *
 *   Stock mode -> "Buy $<price>"        enabled while the hero can afford it
 *   Pack mode  -> "Sell $<sell price>"  enabled while a row is selected
 *
 * `doIdentify()` (used by arWeapon/arDwfSmith's "Identify" special) clears the
 * `Secret` trait of the selected weapon for `costSpecial()` money.
 *
 * Naming note: Java had a `Button transact` field *and* a `void transact()`
 * method.  JS cannot have both on one object, so the method is `doTransact()`
 * here (it is package-private in Java, so no subclass can see it either way).
 */

import { Item } from "../../Items/Item";
import { itArms } from "../../Items/List/itArms";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { Shop } from "./Shop";

export abstract class Smith extends Shop {
  protected transact!: Button;

  /**
   * Java redeclares the price hook as `public abstract int stockValue(Item item)`,
   * so every concrete smith (arWeapon, arArmour, arDwfSmith) must price its own
   * wares.
   */
  abstract override stockValue(it: Item | null): number;

  /** Java `Smith(Screen from, String name)`. */
  constructor(from?: Screen | string | null, name?: string) {
    super(from, name);
  }

  /** Java `Smith.init()`. */
  override init(): void {
    super.init();
    this.updateTools();
  }

  /** Java `Smith.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.transact) {
      this.doTransact();
    }
    if (e.target === this.special) {
      this.doSpecial();
    }
    return super.action(e, o);
  }

  /** Java `Smith.createTools()`. */
  override createTools(): void {
    super.createTools();
    this.transact = new Button("Buy");
    this.transact.reshape(180, 50, 100, 20);
    this.transact.setFont(Tools.textF);
  }

  /** Java `Smith.addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.transact);
  }

  /** Java `Smith.updateTools()`. */
  override updateTools(): void {
    super.updateTools();
    const it = this.shopFind();
    if (this.isPack()) {
      this.transact.setLabel(`Sell $${this.packValue(it)}`);
      this.transact.enable(it !== null);
      return;
    }
    const cost = this.stockValue(it);
    this.transact.setLabel(`Buy $${cost}`);
    this.transact.enable(it !== null && Number(Screen.getHero().getMoney()) >= cost);
  }

  /** Java `protected boolean discardStock(Item it)`. */
  override discardStock(it: Item): boolean {
    return !(it instanceof itArms);
  }

  /** Java `protected boolean discardPack(Item it)`. */
  override discardPack(it: Item): boolean {
    return !(it instanceof itArms);
  }

  /** Java `void transact()`: buy or sell the selected weapon. */
  private doTransact(): void {
    const it = this.shopFind();
    if (it !== null && it instanceof itArms) {
      if (this.isPack()) {
        this.sellWeapon(it);
      } else {
        this.buyWeapon(it);
      }
    }
  }

  /** Java `void buyWeapon(itArms it)`. */
  private buyWeapon(it: itArms): void {
    const cost = this.stockValue(it);
    if (cost <= Screen.getMoney()) {
      Screen.subMoney(cost);
      Screen.getPack().insert(it.copy());
      // don't switch to Sell list after buy
      // setMode(1);
      this.shopList(it);
    }
  }

  /** Java `void sellWeapon(itArms it)`. */
  private sellWeapon(it: itArms): void {
    const cost = this.packValue(it);
    Screen.subPack(it);
    Screen.addMoney(cost);
    this.table.delItem(this.table.getSelect());
  }

  /** Java `public void doIdentify()`. */
  doIdentify(): void {
    const h = Screen.getHero();
    const a = this.shopFind();
    if (a !== null && a instanceof itArms && a.hasTrait(ArmsTrait.SECRET)) {
      const cost = this.costSpecial();
      if (Number(h.getMoney()) >= cost) {
        h.subMoney(cost);
        a.clrTrait(ArmsTrait.SECRET);
        this.getTable().setItem(this.shopName(a), this.getTable().getSelect());
      }
    }
  }
}
