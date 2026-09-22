import { Buffer } from "../Tools/Buffer";

/**
 * Factory function signature used by {@link Item.factory}.
 * (Java: `public static Item factory(Buffer buf)` implemented by every concrete class.)
 */
export type ItemFactory = (buf: Buffer) => Item | null;

/**
 * Java: DCourt/Items/Item.class
 *
 * Abstract base of every persistable entity.  The save format is defined by
 * `toString(depth)` / the per-class `factory()` pair: every entity is
 * `{icon|name|<fields>}` with `|` separators, nested entities are inline.
 *
 * Java declares both `toString()` and `toString(int depth)`; here they are one
 * method with a default depth of 0 (both Java forms produce identical text for
 * every concrete class).
 */
export abstract class Item {
  public abstract copy(): Item;

  public abstract toString(depth?: number): string;

  public abstract getIcon(): string;

  public abstract getName(): string;

  public abstract setName(str: string | null): void;

  public abstract isValid(): boolean;

  public abstract toShow(): string;

  public abstract toLoot(): string;

  public abstract isMatch(it: Item | string | null): boolean;

  public abstract getValue(): string | null;

  public abstract setValue(str: string | null): void;

  public abstract getCount(): number;

  public abstract setCount(i: number): void;

  public abstract add(i: number): number;

  public abstract sub(i: number): number;

  public abstract decay(i: number): boolean;

  public abstract toLong(): number;

  public abstract toInteger(): number;

  /** Java: `protected String toStringHead(int depth)` — leading tabs, `{`, icon, `|`, name. */
  protected toStringHead(depth: number): string {
    let msg = "";
    for (let ix = 0; ix < depth; ix++) {
      msg = msg.concat("\t");
    }
    return msg + "{" + this.getIcon() + "|" + this.getName();
  }

  // ---------------------------------------------------------------------------
  // Factory dispatch
  // ---------------------------------------------------------------------------
  /*
   * Java's `Item.factory` names its subclasses directly (`itCount.factory(buf)`
   * and friends) and the JVM resolves those classes lazily on first use.
   * ES modules cannot express that graph: `Item` would have to import its own
   * subclasses while they must import `Item` for `extends`, and a cyclic
   * `extends` throws ("Cannot access 'Item' before initialization" /
   * "Class extends value undefined") under node ESM, CJS and the esbuild bundle
   * alike.  So each subclass module registers its prefix(es) here instead and
   * the dispatch below reproduces the Java order.  The public API is unchanged:
   * `Item.factory(textOrBuffer)`.
   *
   * Prefixes are mutually exclusive, so registration order does not matter.
   */
  private static readonly prefixFactories: Array<{ prefix: string; make: ItemFactory }> = [];

  private static defaultFactory: ItemFactory | null = null;

  /** Registers the factory for one or more `{icon|` prefixes (called by subclass modules). */
  public static registerFactory(prefixes: string | string[], make: ItemFactory): void {
    const list = typeof prefixes === "string" ? [prefixes] : prefixes;
    for (const prefix of list) {
      Item.prefixFactories.push({ prefix, make });
    }
  }

  /** Registers the catch-all factory (Java: the trailing `itToken.factory(buf)`). */
  public static registerDefaultFactory(make: ItemFactory): void {
    Item.defaultFactory = make;
  }

  /** Java: `factory(String val)` and `factory(Buffer buf)`. */
  public static factory(val: string | Buffer): Item | null {
    const buf = typeof val === "string" ? new Buffer(val) : val;
    for (const entry of Item.prefixFactories) {
      if (buf.startsWith(entry.prefix)) {
        return entry.make(buf);
      }
    }
    return Item.defaultFactory === null ? null : Item.defaultFactory(buf);
  }
}
