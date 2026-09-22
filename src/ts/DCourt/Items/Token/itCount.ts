import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { Item } from "../Item";
import { itToken } from "../itToken";

/**
 * Java: DCourt/Items/Token/itCount.class
 *
 * A named counter (`{#|name|count}`).  Java stores `count` obfuscated as
 * `value + offset` with a random offset; the serialized form is the real count,
 * so saves round-trip unchanged.
 */
export class itCount extends itToken {
  private value = 0;

  private offset = 0;

  public constructor();

  public constructor(id: string | null);

  public constructor(it: itCount | null | undefined);

  public constructor(id: string | null, num: number);

  public constructor(idOrIt?: string | itCount | null, num?: number) {
    if (idOrIt instanceof itCount) {
      // Java: `this(it.getName(), it.getCount())`
      super(idOrIt.getName());
      this.setCount(idOrIt.getCount());
    } else {
      super(idOrIt === undefined ? null : idOrIt);
      this.setCount(num === undefined ? 0 : num);
    }
  }

  public override copy(): Item {
    return new itCount(this);
  }

  public override getIcon(): string {
    return "#";
  }

  public override toString(depth = 0): string {
    return this.toStringHead(depth) + "|" + this.getCount() + "}";
  }

  public static override factory(buf: Buffer): Item | null {
    const it = new itCount();
    if (!buf.begin()) {
      return null;
    }
    const msg = buf.token();
    if (msg === null || msg.length !== 1) {
      return null;
    }
    if (buf.split()) {
      it.setName(buf.token());
    }
    if (buf.split()) {
      it.setCount(buf.num());
    }
    if (!buf.end()) {
      return null;
    }
    return it;
  }

  public override setCount(num: number): void {
    this.offset = Tools.roll(1024) + 1;
    this.value = num - this.offset;
  }

  public override getCount(): number {
    return this.value + this.offset;
  }

  public makeCount(): number {
    return this.getCount();
  }

  public display(): string {
    return this.getName() + "[" + this.getCount() + "]";
  }

  /** Java: `add(itCount)` and the inherited `add(int)` overload. */
  public override add(itcOrNum: itCount | number): number {
    if (typeof itcOrNum !== "number") {
      return this.add(itcOrNum.getCount());
    }
    if (itcOrNum > 0) {
      this.setCount(this.getCount() + itcOrNum);
    }
    return this.getCount();
  }

  /** Java: `adds(itCount)` and `adds(int)` overloads (unconditional add). */
  public adds(itcOrNum: itCount | number): number {
    const num = typeof itcOrNum === "number" ? itcOrNum : itcOrNum.getCount();
    this.setCount(this.getCount() + num);
    return this.getCount();
  }

  /** Java: `sub(itCount)` and the inherited `sub(int)` overload. */
  public override sub(itcOrNum: itCount | number): number {
    let num = typeof itcOrNum === "number" ? itcOrNum : itcOrNum.getCount();
    const sum = this.getCount();
    if (num < 0) {
      return 0;
    }
    if (num > sum) {
      num = sum;
    }
    this.setCount(sum - num);
    return num;
  }
}

Item.registerFactory("{#|", (buf: Buffer): Item | null => itCount.factory(buf));
