/**
 * arNotice - the DOM port of `DCourt.Screens.Utility.arNotice`.
 *
 * Java's black "read this text, click to continue" screen: it fills the whole
 * 400x300 panel black, word-wraps the message with `Breaker` and draws it white
 * in `courtF`.  It is also the base class of a large family of screens
 * (`arDetail`, `arPeer`, `arExit`, the queen's games, ...), which is why those
 * subclasses call `super(from, "<title>")` in Java: the two-argument
 * `arNotice(Screen, String)` constructor stores its second argument as the
 * *message*, not the title, so every subclass still gets the "arNotice" title
 * and then overwrites the message.
 *
 * DOM notes:
 *  - Java's `Graphics` becomes `paintLayer` primitives (`fill` + `label`);
 *    `drawText` keeps Java's baseline arithmetic (`dy + ascent + ix*height`)
 *    with a `FontMetrics` adapter built from the CSS metrics of the `courtF`
 *    slot, exactly as `arQuest` does for `questF`.
 *  - Java's `repaint()` is asynchronous, so subclasses could call `setMessage`
 *    from their constructors before `createTools()` had run.  The port's
 *    `repaint()` is synchronous (see `ui/screen.ts`), so `setMessage` only
 *    repaints once `init()` has started; before that the message is simply
 *    painted by the first `init()` repaint, which matches what AWT showed.
 */

import { Breaker, type FontMetrics } from "../../Tools/Breaker";
import { Tools } from "../../Tools/Tools";
import { COLORS, fontAscent, lineHeight, textWidth, type ColorSpec } from "../../ui/dom";
import { Screen } from "../../ui/screen";

/** `FontMetrics` for the `courtF` slot (Java measured the real font). */
const COURT_METRICS: FontMetrics = {
  stringWidth: (text: string) => textWidth(text, "courtF"),
  charWidth: (code: number) => textWidth(String.fromCharCode(code), "courtF"),
  getAscent: () => fontAscent("courtF"),
  getHeight: () => lineHeight("courtF"),
};

export class arNotice extends Screen {
  private text: string | null = null;

  /** True once `init()` has run, i.e. `createTools()` has built the widgets. */
  private ready = false;

  /**
   * Java overloads:
   *   arNotice(Screen from)         -> empty black screen
   *   arNotice(Screen from, String msg)
   */
  constructor(from: Screen | null, msg?: string) {
    super(from, "arNotice");
    this.hideStatusBar();
    if (msg !== undefined) {
      this.setMessage(msg);
    }
  }

  /** Java `init()`. */
  override init(): void {
    this.ready = true;
    super.init();
  }

  /** Java `setMessage(String msg)`. */
  setMessage(msg: string | null): void {
    this.text = msg;
    // Java queued this repaint; only run it once the widgets exist (see above).
    if (this.ready) {
      this.repaint();
    }
  }

  /** The current message text (Java's package-private `text` field). */
  getMessage(): string | null {
    return this.text;
  }

  /** Java `localPaint(Graphics)`: black panel, white wrapped text at (10, 5). */
  override localPaint(): void {
    this.fill(0, 0, Tools.DEFAULT_WIDTH, Tools.DEFAULT_HEIGHT, COLORS.black);
    this.drawText(10, 5, COLORS.white);
  }

  /** Java `drawText(Graphics, int dx, int dy)`. */
  drawText(dx: number, dy: number, col: ColorSpec = this.getForeground()): void {
    if (this.text === null) {
      return;
    }
    const snap = new Breaker(this.text, COURT_METRICS, 380, false);
    for (let ix = 0; ix < snap.lineCount(); ix++) {
      this.label(snap.getLine(ix) ?? "", dx, dy + snap.getAscent() + ix * snap.getHeight(), {
        font: Tools.courtF,
        color: col,
      });
    }
  }

  /** Java `down(int x, int y)`: a click anywhere returns to the home screen. */
  override down(_x: number, _y: number): Screen | null {
    if (Tools.movedAway(this)) {
      return null;
    }
    Tools.setRegion(this.getHome());
    return null;
  }
}
