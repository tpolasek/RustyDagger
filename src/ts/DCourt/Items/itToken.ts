import { Buffer } from "../Tools/Buffer";
import { Item } from "./Item";
import { logError } from "../Tools/Tools";

/**
 * java.lang.String.hashCode() — 31 * h + c over UTF-16 code units, 32-bit wrapped.
 * Used only for the `itToken` hash-integrity check (`isValid`), never serialized.
 */
export function javaStringHashCode(s: string): number {
  let hash = 0;
  for (let ix = 0; ix < s.length; ix++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(ix)) | 0;
  }
  return hash;
}

/** java.lang.String.equalsIgnoreCase() — Java compares both upper- and lower-cased forms. */
export function equalsIgnoreCase(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  return a.toUpperCase() === b.toUpperCase() || a.toLowerCase() === b.toLowerCase();
}

/** java.lang.Integer.parseInt() — optional sign, digits only, must fit in 32 bits. */
export function javaParseInt(s: string | null): number {
  if (s === null || !/^[+-]?[0-9]+$/.test(s)) {
    throw new Error("NumberFormatException: [" + s + "]");
  }
  const num = Number(s);
  if (!Number.isSafeInteger(num) || num < -2147483648 || num > 2147483647) {
    throw new Error("NumberFormatException: out of int range: [" + s + "]");
  }
  return num;
}

/**
 * java.lang.Long.parseLong() — optional sign, digits only, must fit in 64 bits.
 * (Java longs beyond 2^53 lose precision when represented as a JS number.)
 */
export function javaParseLong(s: string | null): number {
  if (s === null || !/^[+-]?[0-9]+$/.test(s)) {
    throw new Error("NumberFormatException: [" + s + "]");
  }
  const num = Number(s);
  if (!Number.isFinite(num) || Math.abs(num) > 9.223372036854776e18) {
    throw new Error("NumberFormatException: out of long range: [" + s + "]");
  }
  return num;
}

/**
 * Java: DCourt/Items/itToken.class
 *
 * A bare name token.  Also the base of every other item class, holding the
 * `name` + `hash` pair whose invariant is checked by {@link isValid}.
 */
export class itToken extends Item {
  private name: string | null = null;

  private hash = 0;

  public constructor(id: string | null) {
    super();
    this.setName(id);
  }

  public copy(): Item {
    // Java: `new itToken(this)` — the copy constructor reads the raw field, so a
    // corrupt token is copied without triggering the integrity check.
    return new itToken(this.name);
  }

  public getIcon(): string {
    return "";
  }

  public toString(depth = 0): string {
    let msg = "";
    for (let ix = 0; ix < depth; ix++) {
      msg = msg.concat("\t");
    }
    return msg.concat(this.getName());
  }

  public static override factory(buf: Buffer): Item | null {
    const it = new itToken(buf.token());
    const name: string | null = it.getName();
    if (name === null || name.length < 1 || name.charAt(0) === "{" || name.charAt(0) === "}") {
      return null;
    }
    return it;
  }

  /**
   * Java: `getName()` calls `System.exit(-1)` when the hash invariant is broken.
   * The port throws instead — a corrupt save must not kill the browser page.
   *
   * NOTE: Java can return `null` here for a nameless token (name == null && hash
   * == 0 is "valid"); callers that care test for it locally.
   */
  public getName(): string {
    if (!this.isValid()) {
      throw new Error("itToken integrity failure (hash mismatch) for [" + this.name + "]");
    }
    return this.name as string;
  }

  public setName(val: string | null): void {
    this.name = val;
    this.hash = val === null ? 0 : javaStringHashCode(val);
  }

  public isValid(): boolean {
    return (
      (this.name === null && this.hash === 0) ||
      this.hash === javaStringHashCode(this.name as string)
    );
  }

  public toShow(): string {
    return this.getName() + "(" + this.getCount() + ")";
  }

  public toLoot(): string {
    return this.getCount() + " " + this.getName();
  }

  public getValue(): string | null {
    return null;
  }

  public setValue(_val: string | null): void {
    // Java: empty body.
  }

  public isMatch(it: Item | string | null): boolean {
    // Java: separate `isMatch(Item)` / `isMatch(String)` overloads; both compare
    // the raw field (not getName(), to avoid the exit/throw on corrupt tokens).
    if (it === null || this.name === null) {
      return false;
    }
    const other = typeof it === "string" ? it : it.getName();
    return equalsIgnoreCase(this.name, other);
  }

  public getCount(): number {
    return 1;
  }

  public setCount(_num: number): void {
    // Java: empty body.
  }

  public add(_val: number): number {
    return 0;
  }

  public sub(_val: number): number {
    return 0;
  }

  public decay(_val: number): boolean {
    return false;
  }

  public toInteger(): number {
    try {
      return javaParseInt(this.name);
    } catch {
      logError("itToken.toInteger() failed for [" + this.name + "]");
      return 0;
    }
  }

  public toLong(): number {
    try {
      return javaParseLong(this.name);
    } catch {
      logError("itToken.toLong() failed for [" + this.name + "]");
      return 0;
    }
  }
}

// Java's `Item.factory` falls through to `itToken.factory(buf)` for anything that
// is not a recognised `{icon|` prefix; registered here instead of imported (see Item.ts).
Item.registerDefaultFactory((buf: Buffer): Item | null => itToken.factory(buf));
