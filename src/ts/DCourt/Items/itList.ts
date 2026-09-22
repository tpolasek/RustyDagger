import { Buffer } from "../Tools/Buffer";
import { Tools } from "../Tools/Tools";
import { Item } from "./Item";
import { itToken } from "./itToken";
import { itCount } from "./Token/itCount";
import { itValue } from "./Token/itValue";
// Type-only: `itArms extends itList`, so importing it for real would create an
// ES-module inheritance cycle (see the factory note in Item.ts).
import type { itArms } from "./List/itArms";

/** Icon of `itArms`; the only class that reports it (see listBody/findArms). */
const ARMS_ICON = "itArms";

/**
 * Java: DCourt/Items/itList.class
 *
 * A named, ordered bag of items (`{~|name|child|child}`).  Also the base of every
 * "entity with lists" (itArms, itText, itNote, itAgent, ...).
 */
export class itList extends itToken {
  private queue: Item[] = [];

  public constructor(id: string | null);

  public constructor(id: string | null, list: string[]);

  public constructor(it: itList);

  public constructor(idOrIt: string | itList | null, list?: string[]) {
    if (idOrIt instanceof itList) {
      super(idOrIt.getName());
      for (let ix = 0; ix < idOrIt.getCount(); ix++) {
        // Java: `append(it.select(ix).copy())`
        this.append(idOrIt.select(ix)!.copy());
      }
    } else {
      super(idOrIt);
      if (list !== undefined) {
        this.merge(list);
      }
    }
  }

  public override copy(): Item {
    return new itList(this);
  }

  public override getIcon(): string {
    return "~";
  }

  public override toString(depth = 0): string {
    return this.toStringHead(depth) + this.listBody(depth);
  }

  public override toShow(): string {
    return this.getName() + "(1)";
  }

  public override toLoot(): string {
    return "1 " + this.getName();
  }

  public listBody(depth: number): string {
    let result = "";
    let count = 0;
    for (let ix = 0; ix < this.queue.length; ix++) {
      const it = this.queue[ix];
      result = result.concat("|");
      count = it.getIcon().length < 1 ? count + 1 : count + 2;
      // Java: `(it instanceof itArms) || (it instanceof itList) || count >= 6`;
      // itArms is an itList, so the itList test already covers it.
      if (it instanceof itList || count >= 6) {
        result = result.concat("\n" + it.toString(depth + 1));
        count = count >= 6 ? 0 : 5;
      } else {
        result = result.concat(it.toString());
      }
    }
    return result.concat("}");
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin()) {
      return null;
    }
    if (!(buf.match("itList") || buf.match("~")) || !buf.split()) {
      return null;
    }
    const what = new itList(buf.token());
    what.loadBody(buf);
    return what;
  }

  public loadBody(buf: Buffer): void {
    while (buf.split()) {
      this.append(Item.factory(buf));
    }
    buf.end();
  }

  /** Java returned a `java.util.Enumeration`; the port exposes the live array. */
  public elements(): Item[] {
    return this.queue;
  }

  public override isValid(): boolean {
    if (!super.isValid()) {
      return false;
    }
    for (let ix = 0; ix < this.queue.length; ix++) {
      if (!this.queue[ix].isValid()) {
        return false;
      }
    }
    return true;
  }

  /** Java: `getCount()` (size), `getCount(Item)` and `getCount(String)` overloads. */
  public override getCount(idOrItem?: string | Item): number {
    if (idOrItem === undefined) {
      return this.queue.length;
    }
    const it = typeof idOrItem === "string" ? this.find(idOrItem) : this.find(idOrItem.getName());
    return it === null ? 0 : it.getCount();
  }

  public isEmpty(): boolean {
    return this.getCount() < 1;
  }

  public getQueue(): Item[] {
    return this.queue;
  }

  public clrQueue(): void {
    this.queue.length = 0;
  }

  public merge(listOrItems: itList | string[]): void {
    if (listOrItems instanceof itList) {
      const e = listOrItems.elements();
      for (let ix = 0; ix < e.length; ix++) {
        this.insert(e[ix]);
      }
    } else {
      for (const str of listOrItems) {
        this.append(new itToken(str));
      }
    }
  }

  public override decay(rate: number): boolean {
    let result = false;
    for (let ix = 0; ix < this.getCount(); ix++) {
      if (this.select(ix)!.decay(rate)) {
        result = true;
      }
    }
    return result;
  }

  /** Java: `insert(String)`, `insert(String,String)` and `insert(Item)` overloads. */
  public insert(idOrIt: string | Item | null, val?: string | null): void {
    if (typeof idOrIt === "string") {
      this.putItem(val === undefined ? new itToken(idOrIt) : new itValue(idOrIt, val), true);
    } else {
      this.putItem(idOrIt, true);
    }
  }

  /** Java: `append(String)`, `append(String,String)` and `append(Item)` overloads. */
  public append(idOrIt: string | Item | null, val?: string | null): void {
    if (typeof idOrIt === "string") {
      this.putItem(val === undefined ? new itToken(idOrIt) : new itValue(idOrIt, val), false);
    } else {
      this.putItem(idOrIt, false);
    }
  }

  /** Shared body of insert()/append(): itCount entries are merged, not duplicated. */
  private putItem(it: Item | null, front: boolean): void {
    if (it === null) {
      return;
    }
    if (!(it instanceof itCount) || this.find(it.getName()) === null) {
      if (front) {
        this.queue.unshift(it);
      } else {
        this.queue.push(it);
      }
    } else {
      this.add(it);
    }
  }

  /** Java: `add(String,int)` and `add(itCount)` overloads (plus the inherited `add(int)`). */
  public override add(idOrItc: string | itCount | number, num?: number): number {
    if (typeof idOrItc === "number") {
      return super.add(idOrItc);
    }
    const itc = typeof idOrItc === "string" ? new itCount(idOrItc, num === undefined ? 0 : num) : idOrItc;
    if (itc.getCount() < 1) {
      return this.getCount(itc);
    }
    const it = this.find(itc.getName());
    if (it !== null) {
      return it.add(itc.getCount());
    }
    this.insert(itc);
    return itc.getCount();
  }

  public hasTrait(id: string): boolean {
    return this.find(id) instanceof itToken;
  }

  public fixTrait(id: string): void {
    if (id !== null) {
      this.drop(id);
      this.append(new itToken(id));
    }
  }

  public clrTrait(id: string): void {
    if (id !== null) {
      const it = this.find(id);
      if (it !== null && it instanceof itToken) {
        this.drop(it);
      }
    }
  }

  public dropAll(): void {
    this.queue.length = 0;
  }

  /** Java: `drop(String)` and `drop(Item)` overloads. */
  public drop(idOrItem: string | Item | null): Item | null {
    const it = typeof idOrItem === "string" ? this.find(idOrItem) : idOrItem;
    if (it !== null && it !== undefined) {
      const ix = this.queue.indexOf(it);
      if (ix >= 0) {
        this.queue.splice(ix, 1);
        return it;
      }
    }
    return null;
  }

  /** Java: `sub(itCount)` and `sub(String,int)` overloads (plus the inherited `sub(int)`). */
  public override sub(idOrIt: string | itCount | number, num?: number): number {
    if (typeof idOrIt === "number") {
      return super.sub(idOrIt);
    }
    if (typeof idOrIt !== "string") {
      return this.sub(idOrIt.getName(), idOrIt.getCount());
    }
    const sum = num === undefined ? 0 : num;
    if (sum < 1) {
      return this.getCount(idOrIt);
    }
    const it = this.find(idOrIt);
    if (it === null || !(it instanceof itCount)) {
      return 0;
    }
    const have = it.getCount();
    if (sum < have) {
      return it.sub(sum);
    }
    this.drop(it);
    return have;
  }

  public zero(id: string): void {
    const it = this.find(id);
    if (it !== null && it instanceof itCount) {
      this.drop(it);
    }
  }

  public dropItem(id: string): void {
    const it = this.find(id);
    if (it !== null && it instanceof Item) {
      this.drop(it);
    }
  }

  /** Java: `fix(String,int)`, `fix(String,String)` and `fix(Item)` overloads. */
  public fix(idOrIt: string | Item, val?: number | string | null): void {
    if (typeof idOrIt === "string") {
      this.fixItem(typeof val === "number" ? new itCount(idOrIt, val) : new itValue(idOrIt, val === undefined ? null : val));
    } else {
      this.fixItem(idOrIt);
    }
  }

  private fixItem(it: Item): void {
    this.drop(it.getName());
    this.append(it);
  }

  public update(list: itList): void {
    const e = this.elements();
    for (let ix = 0; ix < e.length; ix++) {
      list.fix(e[ix]);
    }
  }

  public fixList(id: string): itList {
    let it: Item | null = this.find(id);
    if (it === null || !(it instanceof itList)) {
      this.drop(it);
      const itlist = new itList(id);
      it = itlist;
      this.append(itlist);
    }
    return it as itList;
  }

  /** Java: `select(int)` and `select(String,int)` overloads. */
  public select(ixOrId: number | string, num?: number): Item | null {
    if (typeof ixOrId === "string") {
      let count = 0;
      const e = this.elements();
      for (let ix = 0; ix < e.length; ix++) {
        const it = e[ix];
        if (it.isMatch(ixOrId)) {
          count++;
          if (count > (num === undefined ? 0 : num)) {
            return it;
          }
        }
      }
      return null;
    }
    if (ixOrId < 0 || ixOrId >= this.queue.length) {
      return null;
    }
    return this.queue[ixOrId];
  }

  public indexOf(what: Item): number {
    return this.queue.indexOf(what);
  }

  public firstOf(id: string): number {
    for (let ix = 0; ix < this.getCount(); ix++) {
      if (this.select(ix)!.isMatch(id)) {
        return ix;
      }
    }
    return -1;
  }

  public find(id: string): Item | null {
    for (let ix = 0; ix < this.queue.length; ix++) {
      const it = this.queue[ix];
      if (it.isMatch(id)) {
        return it;
      }
    }
    return null;
  }

  public contains(id: string): boolean {
    return this.find(id) !== null;
  }

  /** Java: `getValue(String id)` overload; the no-arg form is the inherited `itToken.getValue()`. */
  public override getValue(id?: string): string | null {
    if (id === undefined) {
      return super.getValue();
    }
    const it = this.find(id);
    if (it === null || !(it instanceof itValue)) {
      return null;
    }
    return it.getValue();
  }

  public loseHalf(): void {
    let ix = 0;
    while (ix < this.getCount()) {
      const it = this.select(ix)!;
      if (it instanceof itCount) {
        it.sub(Tools.roll(1 + it.getCount()));
        if (it.getCount() > 0) {
          ix++;
        }
        // Java: drop(it); ix--; ix++  (kept verbatim)
        this.drop(it);
        ix--;
        ix++;
      } else {
        if (Tools.chance(2)) {
          ix++;
        }
        this.drop(it);
        ix--;
        ix++;
      }
    }
  }

  public fullSkill(): number {
    let skill = 0;
    for (let ix = 0; ix < this.getCount(); ix++) {
      const it = this.select(ix)!;
      // Java: `it instanceof itArms` (see ARMS_ICON note above).
      if (it instanceof itList && it.getIcon() === ARMS_ICON) {
        skill += it.fullSkill();
      }
    }
    return skill;
  }

  public fullAttack(): number {
    let attack = 0;
    for (let ix = 0; ix < this.getCount(); ix++) {
      const it = this.select(ix)!;
      if (it instanceof itList && it.getIcon() === ARMS_ICON) {
        attack += it.fullAttack();
      }
    }
    return attack;
  }

  public fullDefend(): number {
    let defend = 0;
    for (let ix = 0; ix < this.getCount(); ix++) {
      const it = this.select(ix)!;
      if (it instanceof itList && it.getIcon() === ARMS_ICON) {
        defend += it.fullDefend();
      }
    }
    return defend;
  }

  public findArms(id: string): itArms | null {
    for (let ix = 0; ix < this.getCount(); ix++) {
      const what = this.select(ix)!;
      if (what instanceof itList && what.getIcon() === ARMS_ICON && what.hasTrait(id)) {
        return what as unknown as itArms;
      }
    }
    return null;
  }
}

Item.registerFactory(["{~|", "{itList|"], (buf: Buffer): Item | null => itList.factory(buf));
