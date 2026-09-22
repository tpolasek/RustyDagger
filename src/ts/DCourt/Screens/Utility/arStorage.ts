/**
 * arStorage - the DOM port of `DCourt.Screens.Utility.arStorage`.
 *
 * The inn/storage screen: a thin `Transfer` subclass that moves items between
 * the hero's pack and their persistent store, capped by `itHero.storeMax()`.
 * Only the constructor, the two header lines and the `Transfer` defaults are
 * arStorage's own; every movement is inherited (see `Template/Transfer`).
 *
 * The Java `localPaint` draws the pack load against the hero's `packMax()` and
 * the store load against the transfer limit.
 */

import type { itHero } from "../../Items/List/itHero";
import { itList } from "../../Items/itList";
import { Tools } from "../../Tools/Tools";
import { COLORS, color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Transfer } from "../Template/Transfer";

export class arStorage extends Transfer {
  /** Java `arStorage(Screen from)`. */
  constructor(from: Screen) {
    super(from, "Storage at ".concat(String(from.getTitle())));
    this.setBackground(color(0, 0, 128));
    this.setForeground(COLORS.white);
    const h = Tools.getHero() as unknown as itHero;
    this.setValues(h.storeMax(), Screen.getPack() as unknown as itList, h.getStore());
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    super.localPaint();
    this.updateTools();
    const col = this.getForeground();
    this.label(
      `Backpack ${Screen.getPack().getCount()}/${Screen.getHero().packMax()}`,
      30,
      65,
      { font: Tools.statusF, color: col },
    );
    this.label(`Storage ${this.stashCount()}/${this.getLimit()}`, 230, 65, {
      font: Tools.statusF,
      color: col,
    });
  }
}
