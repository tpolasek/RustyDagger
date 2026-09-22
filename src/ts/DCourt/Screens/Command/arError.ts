/**
 * arError - the DOM port of `DCourt.Screens.Command.arError`.
 *
 * The last-resort red error screen: it prints "ERROR - Dragon Court Error has
 * occurred" plus the problem text (split on '\n', the same 15 pixel line pitch
 * as the Java paint loop), and a click anywhere goes back to `getHome()`.
 *
 * Java had two constructors - the package-private `arError()` (used only by
 * `Class.newInstance()`-style lookups, and it forgot to set the colors) and the
 * public `arError(String err)`.  The port keeps one signature; the red/white
 * error look is applied in both cases.
 *
 * `Player.errorScreen()` reaches this screen through
 * `ScreenRegistry.getErrorScreen()` (the Control layer must not import screens),
 * registered from `Command/arLoading.ts`; see `Control/Player.ts`.
 */

import { COLORS } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { Tools } from "../../Tools/Tools";

export class arError extends Screen {
  /** Java `String problem`, defaulting to "Unknown Error". */
  private problem: string;

  constructor(err = "Unknown Error") {
    super();
    this.problem = err;
    this.setBackground(COLORS.red);
    this.setForeground(COLORS.white);
    this.setFont(Tools.textF);
    this.hideStatusBar();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    let msg = this.problem;
    // Java drew the inherited title line first (`Screen.localPaint`).
    super.localPaint();
    const fg = this.getForeground();
    let v = 10 + 15;
    this.label("ERROR - Dragon Court Error has occurred", 10, v, { color: fg });
    for (;;) {
      const ix = msg.indexOf("\n");
      if (ix === -1) {
        this.label(msg, 30, v + 15, { color: fg });
        return;
      }
      v += 15;
      this.label(msg.substring(0, ix), 30, v, { color: fg });
      msg = msg.substring(ix + 1);
    }
  }

  /** Java `action(Event, Object)`: a click on the screen itself returns home. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway() || e.target !== this) {
      return true;
    }
    Tools.setRegion(this.getHome());
    return true;
  }
}
