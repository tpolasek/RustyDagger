import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { Item } from "../Item";
import { itList } from "../itList";

/**
 * Java: DCourt/Items/List/itNote.class
 *
 * A letter/notice (`{itNote|name|{=|from|...}|{=|date|...}|{=|body|...}}`).
 */
export class itNote extends itList {
  private body: string | null = null;

  private from: string | null = null;

  private date: string | null = null;

  public constructor(id: string | null);

  public constructor(id: string | null, from: string, msg: string);

  public constructor(it: itNote);

  public constructor(idOrIt: string | itNote | null, from?: string, msg?: string) {
    if (idOrIt instanceof itNote) {
      super(idOrIt);
      this.fixStrings();
    } else {
      super(idOrIt);
      if (from !== undefined && msg !== undefined) {
        this.setFrom(from);
        this.setDate(Tools.getToday());
        this.setBody(msg);
      }
    }
  }

  public override copy(): Item {
    return new itNote(this);
  }

  public override getIcon(): string {
    return "itNote";
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin() || !buf.match("itNote") || !buf.split()) {
      return null;
    }
    const what = new itNote(buf.token());
    what.loadBody(buf);
    what.fixStrings();
    return what;
  }

  public fixStrings(): void {
    this.from = this.getValue("from");
    this.date = this.getValue("date");
    this.body = this.getValue("body");
  }

  public setFrom(val: string | null): void {
    this.from = val;
    this.fix("from", val);
  }

  public setDate(val: string | null): void {
    this.date = val;
    this.fix("date", val);
  }

  public setBody(val: string | null): void {
    this.body = val;
    this.fix("body", val);
  }

  public getFrom(): string | null {
    return this.from;
  }

  public getDate(): string | null {
    return this.date;
  }

  public getBody(): string | null {
    return this.body;
  }

  /**
   * Java: `itNote.getCount()` returns 1 while `itList.getCount(String|Item)` stays
   * reachable through the inherited overload.
   */
  public override getCount(idOrItem?: string | Item): number {
    if (idOrItem === undefined) {
      return 1;
    }
    return super.getCount(idOrItem);
  }

  /** Java: `getValue()` returns the body; `getValue(String id)` is the inherited list lookup. */
  public override getValue(id?: string): string | null {
    if (id === undefined) {
      return this.body;
    }
    return super.getValue(id);
  }

  public override toShow(): string {
    return this.getName() + ": " + this.getFrom();
  }

  public override toLoot(): string {
    return this.getName();
  }
}

Item.registerFactory("{itNote|", (buf: Buffer): Item | null => itNote.factory(buf));
