import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { MadLib } from "../../Tools/MadLib";
import { Item } from "../Item";
import { itList } from "../itList";

/**
 * Java: DCourt/Items/List/itText.class
 *
 * A named `MadLib` text block plus a list of alternative word lists
 * (`{itText|name|text}`).  `parseText` substitutes `$NAME$`-style keys from the
 * child lists on load.
 */
export class itText extends itList {
  private text: MadLib | null = null;

  public constructor(id: string | null);

  public constructor(id: string | null, msg: string);

  public constructor(it: itText);

  public constructor(idOrIt: string | itText | null, msg?: string) {
    if (idOrIt instanceof itText) {
      super(idOrIt);
      // Java: `this.text = (MadLib) it.text.clone();` — cloned defensively, but
      // Java NPEs when the source has no text; here the null is kept.
      this.text = idOrIt.text === null ? null : idOrIt.text.clone();
    } else {
      super(idOrIt);
      this.text = null;
      if (msg !== undefined) {
        this.setText(msg);
      }
    }
  }

  public override copy(): Item {
    return new itText(this);
  }

  public override getIcon(): string {
    return "itText";
  }

  public override toString(depth = 0): string {
    return this.toStringHead(depth) + "|" + this.getText() + "}";
  }

  public setText(msg: string): void {
    this.text = new MadLib(msg);
  }

  /** Java NPEs when the object was built without text; the port throws a TypeError. */
  public getText(): string {
    return this.text!.getText();
  }

  /** Returns null when the text has no `$NAME$` replacement (Java returns null too). */
  public getIdentity(): string | null {
    return this.text!.getReplace("$NAME$");
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin() || !buf.match("itText") || !buf.split()) {
      return null;
    }
    const it = new itText(buf.token());
    if (buf.split()) {
      it.text = new MadLib(buf.token());
    }
    it.loadBody(buf);
    it.parseText();
    return it;
  }

  public parseText(): void {
    for (let ix = 0; ix < this.getCount(); ix++) {
      const list = this.select(ix)!;
      if (list instanceof itList) {
        const pick = list.select(Tools.roll(list.getCount()));
        if (pick !== null) {
          this.text!.replace(list.getName(), pick.getName());
        }
      }
    }
  }
}

Item.registerFactory("{itText|", (buf: Buffer): Item | null => itText.factory(buf));
