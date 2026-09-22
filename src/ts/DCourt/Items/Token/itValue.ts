import { Buffer } from "../../Tools/Buffer";
import { Item } from "../Item";
import { itToken, javaParseLong } from "../itToken";

/**
 * Java: DCourt/Items/Token/itValue.class
 *
 * A name/value pair (`{=|name|value}`) — the workhorse of the save format
 * (settings, state, clan, place, ...).
 */
export class itValue extends itToken {
  private value: string | null = null;

  public constructor(id: string | null, val: string | null);

  public constructor();

  public constructor(id: string | null);

  public constructor(id: number, val: string | null);

  public constructor(it: itValue);

  public constructor(idOrIt?: string | number | itValue | null, val: string | null = null) {
    if (idOrIt instanceof itValue) {
      // Java: `this(it.getName(), it.getValue())`
      super(idOrIt.getName());
      this.value = idOrIt.getValue();
    } else {
      super(
        idOrIt === undefined || idOrIt === null
          ? null
          : typeof idOrIt === "number"
            ? String(idOrIt)
            : idOrIt,
      );
      this.value = val;
    }
  }

  public override copy(): Item {
    return new itValue(this);
  }

  public override getIcon(): string {
    return "=";
  }

  public override toString(depth = 0): string {
    return this.toStringHead(depth) + "|" + this.getValue() + "}";
  }

  public static override factory(buf: Buffer): Item | null {
    const v = new itValue();
    if (!buf.begin() || !buf.match("=")) {
      return null;
    }
    if (buf.split()) {
      v.setName(buf.token());
    }
    if (buf.split()) {
      v.setValue(buf.token());
    }
    buf.end();
    return v;
  }

  public override getValue(): string | null {
    return this.value;
  }

  public override setValue(val: string | null): void {
    this.value = val;
  }

  public override toLong(): number {
    try {
      return javaParseLong(this.value);
    } catch {
      return 0;
    }
  }

  /** Java: `new Long(value).intValue()` — low 32 bits of the parsed long. */
  public toInt(): number {
    return this.toLong() | 0;
  }
}

Item.registerFactory("{=|", (buf: Buffer): Item | null => itValue.factory(buf));
