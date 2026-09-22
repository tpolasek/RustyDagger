/**
 * Trade - the DOM rewrite of `DCourt.Screens.Template.Trade`
 * (`Template/Trade.java`).
 *
 * Java: the commodity shop variant used by the traders, gem shop and magic
 * shop.  Instead of a price-labelled Transact button it offers four quick
 * quantity buttons (1 / 10 / 100 / 1K) that buy or sell that many items at
 * once; `transact(num)` starts by clearing the hero's "dump" list, exactly like
 * Java.
 *
 * Unlike Smith, a Trade shop also rejects `itArms` rows, so only trade goods
 * are listed.
 */

import { Item } from "../../Items/Item";
import { itArms } from "../../Items/List/itArms";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { Shop } from "./Shop";

export abstract class Trade extends Shop {
  protected one!: Button;
  protected ten!: Button;
  protected hundred!: Button;
  protected kilo!: Button;

  /** Java `Trade(Screen from, String title)`. */
  constructor(from?: Screen | string | null, name?: string) {
    super(from, name);
  }

  /** Java `Trade.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.one) {
      this.transact(1);
    }
    if (e.target === this.ten) {
      this.transact(10);
    }
    if (e.target === this.hundred) {
      this.transact(100);
    }
    if (e.target === this.kilo) {
      this.transact(1000);
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `Trade.createTools()`. */
  override createTools(): void {
    super.createTools();
    this.one = new Button("1");
    this.one.reshape(295, 50, 40, 20);
    this.one.setFont(Tools.textF);
    this.ten = new Button("10");
    this.ten.reshape(250, 50, 40, 20);
    this.ten.setFont(Tools.textF);
    this.hundred = new Button("100");
    this.hundred.reshape(205, 50, 40, 20);
    this.hundred.setFont(Tools.textF);
    this.kilo = new Button("1K");
    this.kilo.reshape(160, 50, 40, 20);
    this.kilo.setFont(Tools.textF);
  }

  /** Java `Trade.addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.one);
    this.add(this.ten);
    this.add(this.hundred);
    this.add(this.kilo);
  }

  /** Java `public boolean discardStock(Item it)` - trades never list arms. */
  override discardStock(it: Item): boolean {
    return it instanceof itArms;
  }

  /** Java `public boolean discardPack(Item it)`. */
  override discardPack(it: Item): boolean {
    return it instanceof itArms;
  }

  /** Java `transact(int num)`: the quantity buttons. */
  transact(num: number): void {
    Screen.getHero().clearDump();
    if (this.isPack()) {
      this.sellItem(num);
    } else {
      this.buyItem(num);
    }
  }
}
