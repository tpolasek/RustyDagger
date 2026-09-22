import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { Item } from "../Item";
import { itCount } from "./itCount";

/**
 * Java: DCourt/Items/Token/itRandom.class
 *
 * A "roll 1..count" counter, used for random loot (`{@|name|max}` — see SPEC.md).
 */
export class itRandom extends itCount {
  public constructor(it?: itCount | null) {
    super(it);
  }

  public override copy(): Item {
    return new itRandom(this);
  }

  public override makeCount(): number {
    return Tools.roll(1 + this.getCount());
  }

  public override getIcon(): string {
    return "*";
  }

  public static override factory(buf: Buffer): Item | null {
    const itc = itCount.factory(buf) as itCount | null;
    // Java would NPE on `new itRandom((itCount) null)`; return null instead so a
    // malformed token is simply dropped by itList.loadBody.
    return itc === null ? null : new itRandom(itc);
  }
}

Item.registerFactory("{@|", (buf: Buffer): Item | null => itRandom.factory(buf));
