/**
 * Indoors - the DOM rewrite of `DCourt.Screens.Template.Indoors`
 * (`Template/Indoors.java`).
 *
 * Java: an abstract Screen for every indoor area (shops, taverns, guild halls).
 * It tints the panel green and adds two portraits - the Exit picture in the
 * top-right corner and the shopkeeper's face on the left - whose caption is the
 * shop's greeting.  Clicking the Exit portrait goes `getHome()`.
 *
 * Port: identical geometry, colors and action routing; the portraits are the
 * `Portrait` DOM widget (their boxes are the click regions), and `Tools.setRegion`
 * is the DOM stage swap.  The greeting is produced by the concrete subclass in
 * `createTools()`/constructor time exactly as in Java (the base constructor calls
 * the abstract `getFace()`/`getGreeting()` before the subclass fields exist -
 * Java did the same).
 */

import { color } from "../../ui/dom";
import { Portrait } from "../../ui/portrait";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { Tools } from "../../Tools/Tools";

export abstract class Indoors extends Screen {
  /** Java `public abstract String getGreeting()`. */
  abstract getGreeting(): string;

  /** Java `public abstract String getFace()`. */
  abstract getFace(): string;

  /**
   * Java `Indoors(Screen from, String name)`.  The TS form also accepts the
   * single-argument Java constructors of `Screen` (`super(name)`), so subclasses
   * may keep whichever Java call shape they were written with.
   */
  constructor(from?: Screen | string | null, name?: string) {
    if (typeof from === "string") super(from, name);
    else if (from) super(from, name);
    else super(name);
    this.setBackground(color(128, 255, 129));
    this.setForeground(color(0, 128, 0));
    this.addPic(new Portrait("Exit.jpg", 320, 10, 64, 32));
    this.addPic(new Portrait(this.getFace(), this.getGreeting(), 10, 30, 144, 192));
  }

  /** Java `Indoors.action`: only the Exit portrait is special. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.getPic(0)) {
      Tools.setRegion(this.getHome());
    }
    return super.action(e, o);
  }
}
