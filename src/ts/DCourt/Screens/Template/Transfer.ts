/**
 * Transfer - the DOM rewrite of `DCourt.Screens.Template.Transfer`
 * (`Template/Transfer.java`).
 *
 * Java: the two-list transfer screen (purse on the left, stash on the right)
 * with a quantity scrollbar in the middle; used by the storage screen and the
 * mail room.  The mechanics are ported verbatim:
 *
 *  - a click on a single item moves one unit straight away; an item with a
 *    count > 1 arms the scrollbar ("Transfer<n>") and waits for the button;
 *  - `itCount` stacks merge by name, other items move by identity;
 *  - `limit` (0 = unlimited) caps how many *slots* the stash may hold.
 *
 * Two Java quirks are kept on purpose:
 *  - `stashList(String)` forwards to `purseList` (a bug in the original);
 *  - the transfer direction is decided by which list has a selection.
 *
 * Naming note: Java had a `Button transfer` field *and* a `void transfer()`
 * method; the method is `doTransfer()` here (package-private in Java).
 */

import { Item } from "../../Items/Item";
import { itCount } from "../../Items/Token/itCount";
import { itValue } from "../../Items/Token/itValue";
import { itList } from "../../Items/itList";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { Screen } from "../../ui/screen";
import { FScrollbar, FTextList } from "../../ui/textList";
import type { GameEvent } from "../../ui/widget";

export abstract class Transfer extends Screen {
  static readonly TRANSFER: string = "Transfer";

  private exit!: Button;
  private transfer!: Button;
  private plist!: FTextList;
  private slist!: FTextList;
  private scroll!: FScrollbar;
  private limit: number = 0;
  private purse: itList | null = null;
  private stash: itList | null = null;

  /** Java `Transfer(Screen from, String name)`. */
  constructor(from?: Screen | string | null, name?: string) {
    super(from, name);
  }

  /** Java `setValues(int limit, itList purse, itList stash)`. */
  setValues(limit: number, purse: itList | null, stash: itList | null): void {
    this.limit = limit;
    this.purse = purse;
    this.stash = stash;
  }

  /** Java `getLimit()`. */
  getLimit(): number {
    return this.limit;
  }

  /** Java `stashCount()`. */
  stashCount(): number {
    if (this.stash === null) {
      return 0;
    }
    return this.stash.getCount();
  }

  /** Java `getStash()`. */
  getStash(): itList | null {
    return this.stash;
  }

  /** Java `clrStash()`. */
  clrStash(): void {
    this.stash!.clrQueue();
  }

  /** Java `Transfer.action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.exit) {
      this.goHome();
    } else if (e.target === this.transfer) {
      this.doTransfer();
    } else if (e.target === this.plist) {
      this.purseSelect();
    } else if (e.target === this.slist) {
      this.stashSelect();
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `goHome()` - arPackage overrides this to empty the stash first. */
  goHome(): void {
    Tools.setRegion(this.getHome());
  }

  /** Java `Transfer.createTools()`. */
  override createTools(): void {
    this.exit = new Button("Exit");
    this.exit.reshape(340, 5, 50, 20);
    this.exit.setFont(Tools.textF);
    this.transfer = new Button("Transfer 0");
    this.transfer.reshape(5, 28, 115, 20);
    this.transfer.setFont(Tools.textF);
    this.transfer.enable(false);
    this.plist = new FTextList();
    this.plist.reshape(5, 70, 190, 190);
    this.slist = new FTextList();
    this.slist.reshape(205, 70, 190, 190);
    this.scroll = new FScrollbar();
    this.scroll.reshape(125, 30, 270, 16);
  }

  /** Java `Transfer.addTools()`. */
  override addTools(): void {
    this.add(this.exit);
    this.add(this.transfer);
    this.add(this.plist);
    this.add(this.slist);
    this.add(this.scroll);
    this.purseList(null);
    this.stashList(null);
  }

  /** Java `updateTools()` - also called from the subclasses' `localPaint`. */
  updateTools(): void {
    this.transfer.enable(this.plist.getSelect() >= 0 || this.slist.getSelect() >= 0);
    this.transfer.setLabel(`${Transfer.TRANSFER}${this.scroll.getVal()}`);
  }

  /**
   * Java overloads `purseList(String)` / `purseList(Item)`; the string form looks
   * the item up by name first.  `null` is the Item overload, as in Java's call
   * `purseList((Item) null)`.
   */
  private purseList(find: string | Item | null): void {
    if (typeof find === "string") {
      // `Tools.truncate` only returns null for a null input.
      this.purseList(this.purse!.find(Tools.truncate(find)!));
      return;
    }
    let select = -1;
    this.plist.clear();
    for (let ix = 0; ix < this.purse!.getCount(); ix++) {
      const it = this.purse!.select(ix)!;
      this.plist.addItem(it.toShow());
      if (it === find) {
        select = ix;
      }
    }
    this.plist.setSelect(select);
  }

  /**
   * Java overloads `stashList(String)` / `stashList(Item)`.
   *
   * Note the original quirk: the String form calls `purseList(...)` (not
   * `stashList`), so a name-based stash lookup refilled the *purse* list.  The
   * method is unreachable from the ported screens (only the Item overload is
   * used), but the behaviour is preserved.
   */
  private stashList(find: string | Item | null): void {
    if (typeof find === "string") {
      this.purseList(this.stash!.find(Tools.truncate(find)!));
      return;
    }
    let select = -1;
    this.slist.clear();
    for (let ix = 0; ix < this.stash!.getCount(); ix++) {
      const it = this.stash!.select(ix)!;
      this.slist.addItem(it.toShow());
      if (it === find) {
        select = ix;
      }
    }
    this.slist.setSelect(select);
  }

  /** Java `purseSelect()`: one-click move, or arm the quantity scrollbar. */
  private purseSelect(): void {
    this.slist.setSelect(-1);
    this.transfer.enable(false);
    const ix = this.plist.getSelect();
    const it = ix < 0 ? null : this.purse!.select(ix);
    if (ix < 0 || it === null) {
      return;
    }
    if (it.getCount() > 1) {
      this.prepareTransfer(it);
      return;
    }
    this.PackToStash(it, ix, 1);
    this.scroll.setMax(0);
  }

  /** Java `stashSelect()`. */
  private stashSelect(): void {
    this.plist.setSelect(-1);
    this.transfer.enable(false);
    const ix = this.slist.getSelect();
    const it = ix < 0 ? null : this.stash!.select(ix);
    if (ix < 0 || it === null) {
      return;
    }
    if (it.getCount() > 1) {
      this.prepareTransfer(it);
      return;
    }
    this.StashToPack(it, ix, 1);
    this.scroll.setMax(0);
  }

  /** Java `prepareTransfer(Item it)`. */
  private prepareTransfer(it: Item | null): void {
    if (it !== null) {
      const val = it.getCount();
      this.scroll.setMax(val);
      this.scroll.setVal(val);
      this.transfer.setLabel(`${Transfer.TRANSFER}${val}`);
      this.transfer.enable(true);
    }
  }

  /** Java `void transfer()`: apply the scrollbar quantity to the live selection. */
  private doTransfer(): void {
    const count = this.scroll.getVal();
    if (count >= 1) {
      const ix = this.plist.getSelect();
      if (ix >= 0) {
        this.PackToStash(ix, count);
      }
      const ix2 = this.slist.getSelect();
      if (ix2 >= 0) {
        this.StashToPack(ix2, count);
      }
    }
  }

  /**
   * Java overloads `PackToStash(int pix, int count)` / `PackToStash(Item, int, int)`.
   * `itCount` stacks merge into the stash (respecting `limit`), other items move
   * by identity; `itValue` entries never move.
   */
  private PackToStash(pix: number, count: number): void;
  private PackToStash(it: Item, pix: number, count: number): void;
  private PackToStash(itOrPix: Item | number, pixOrCount: number, num?: number): void {
    if (typeof itOrPix === "number") {
      const it = this.purse!.select(itOrPix);
      if (it !== null) {
        this.PackToStash(it, itOrPix, pixOrCount);
      }
      return;
    }
    const it = itOrPix;
    const pix = pixOrCount;
    const count = num ?? 0;
    let delSlot = true;
    let newSlot = true;
    // Java's `String id = null`; every path that reads it has assigned a name.
    let id = "";
    let six = 0;
    if (!(it instanceof itValue)) {
      if (it instanceof itCount) {
        id = it.getName();
        delSlot = count >= it.getCount();
        six = this.stash!.firstOf(id);
        newSlot = six < 0;
        if (!newSlot || this.limit <= 0 || this.stash!.getCount() < this.limit) {
          this.stash!.add(id, this.purse!.sub(id, count));
        } else {
          return;
        }
      } else if (this.limit <= 0 || this.stash!.getCount() < this.limit) {
        this.purse!.drop(it);
        this.stash!.insert(it);
      } else {
        return;
      }
      if (delSlot) {
        this.plist.delItem(pix);
      } else {
        this.plist.setItem(this.purse!.find(id)!.toShow(), pix);
      }
      this.plist.setSelect(-1);
      if (newSlot) {
        this.slist.addItem(this.stash!.select(0)!.toShow(), 0);
      } else {
        this.slist.setItem(this.stash!.find(id)!.toShow(), six);
      }
      this.transfer.enable(false);
      this.scroll.setMax(0);
    }
  }

  /** Java overloads `StashToPack(int six, int count)` / `StashToPack(Item, int, int)`. */
  private StashToPack(six: number, count: number): void;
  private StashToPack(it: Item, six: number, count: number): void;
  private StashToPack(itOrSix: Item | number, sixOrCount: number, num?: number): void {
    if (typeof itOrSix === "number") {
      const it = this.stash!.select(itOrSix);
      if (it !== null) {
        this.StashToPack(it, itOrSix, sixOrCount);
      }
      return;
    }
    const it = itOrSix;
    const six = sixOrCount;
    const count = num ?? 0;
    let delSlot = true;
    let newSlot = true;
    // Java's `String id = null`; every path that reads it has assigned a name.
    let id = "";
    let pix = 0;
    if (!(it instanceof itValue)) {
      if (!(it instanceof itCount)) {
        this.stash!.drop(it);
        this.purse!.insert(it);
      } else {
        id = it.getName();
        delSlot = count >= it.getCount();
        pix = this.purse!.firstOf(id);
        newSlot = pix < 0;
        this.purse!.add(id, this.stash!.sub(id, count));
      }
      if (delSlot) {
        this.slist.delItem(six);
      } else {
        this.slist.setItem(this.stash!.find(id)!.toShow(), six);
      }
      this.slist.setSelect(-1);
      if (newSlot) {
        this.plist.addItem(this.purse!.select(0)!.toShow(), 0);
      } else {
        this.plist.setItem(this.purse!.find(id)!.toShow(), pix);
      }
      this.transfer.enable(false);
      this.scroll.setMax(0);
    }
  }
}
