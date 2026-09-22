import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { Item } from "../Item";
import { itCount } from "./itCount";

/**
 * Java: DCourt/Items/Token/itPercent.class
 *
 * A `count%` chance counter (`{%|name|chance}`).
 */
export class itPercent extends itCount {
  public constructor(it?: itCount | null) {
    super(it);
  }

  public override copy(): Item {
    return new itPercent(this);
  }

  public override makeCount(): number {
    return Tools.percent(this.getCount()) ? 1 : 0;
  }

  public override getIcon(): string {
    return "%";
  }

  public static override factory(buf: Buffer): Item | null {
    const itc = itCount.factory(buf) as itCount | null;
    // Java would NPE on `new itPercent((itCount) null)`; return null instead so a
    // malformed token is simply dropped by itList.loadBody.
    return itc === null ? null : new itPercent(itc);
  }
}

Item.registerFactory("{%|", (buf: Buffer): Item | null => itPercent.factory(buf));
