/**
 * FScrollbar + FTextList - the DOM rewrite of `DCourt.Components.FScrollbar`
 * and `DCourt.Components.FTextList` (with the FTLools chrome folded in).
 *
 * Java FTextList is a fixed-height list box showing `showLines()` rows, with an
 * FScrollbar child whose value is the index of the first visible line.  The DOM
 * version keeps exactly that model - the geometry and `setSelect` toggle rules
 * are ported verbatim, small `FixScroller` fixes are noted inline - and renders
 * the visible window as plain elements.  Native scrolling is deliberately *not* used, so programmatic
 * `setSelect(index)` keeps working while the list is scrolled.
 *
 * Screens use these through `Screen`/`Shop`/`arStatus`:
 *   new FTextList(); table.reshape(5, 140, 170, 140); table.setFont(Tools.textF);
 *   table.addItem(name); table.setSelect(ix); table.getSelect();
 *   table.setItem(name, ix); table.delItem(ix); table.clear();
 */

import {
  COLORS,
  type ColorSpec,
  type FontName,
  type RectLike,
  applyBevelColors,
  applyFont,
  assignRect,
  div,
  glowOf,
  inside,
  lineHeight,
  shade,
} from "./dom";
import { Widget } from "./widget";

const VERTICAL = false;

/* ---------------------------------------------------------------- scroll */

export class FScrollbar extends Widget {
  private iMax = 0;
  private iVal = 0;
  private iStep = 0;
  private iJump = 0;
  private horz = VERTICAL;
  private dragging = false;
  private dragOffset = 0;
  private pointerId = 0;

  private headRect: RectLike = { x: 0, y: 0, width: 0, height: 0 };
  private tailRect: RectLike = { x: 0, y: 0, width: 0, height: 0 };
  private bodyRect: RectLike = { x: 0, y: 0, width: 0, height: 0 };
  private thumbRect: RectLike = { x: 0, y: 0, width: 0, height: 0 };

  private readonly head: HTMLDivElement;
  private readonly tail: HTMLDivElement;
  private readonly thumb: HTMLDivElement;

  /**
   * Fires on every user-driven value change.  `dispatch` decides whether the
   * owning screen also receives an action event (Java only repainted the
   * embedded list, but relied on bubbling for standalone scrollbars).
   */
  onChange: (() => void) | null = null;
  dispatch = true;

  /**
   * Java overloads:
   *   new FScrollbar()                        -> 0,0,0,0
   *   new FScrollbar(max)                     -> (max, 0, 1, ceil(max/10))
   *   new FScrollbar(max, jump)               -> (max, 0, 1, jump)
   *   new FScrollbar(max, val, step, jump)
   */
  constructor(max = 0, second?: number, step?: number, jump?: number) {
    super(div("bevel-in"));
    this.el.style.background = COLORS.fill;
    this.el.style.overflow = "hidden";
    this.el.style.cursor = "default";

    this.head = div("bevel-out");
    this.tail = div("bevel-out");
    this.thumb = div("bevel-out");
    for (const part of [this.head, this.tail, this.thumb]) {
      part.style.position = "absolute";
      part.style.overflow = "hidden";
      part.style.textAlign = "center";
      part.style.color = COLORS.dark;
      part.style.fontSize = "8px";
      part.style.lineHeight = "9px";
      part.style.cursor = "pointer";
      this.el.appendChild(part);
    }
    this.head.textContent = "▲";
    this.tail.textContent = "▼";

    this.setBounds(0, 0, 10, 30);
    if (step !== undefined || jump !== undefined) {
      // Java FScrollbar(max, val, step, jump)
      this.setAll(max, second ?? 0, step ?? 0, jump ?? 0);
    } else if (second !== undefined) {
      // Java FScrollbar(max, jump)
      this.setAll(max, 0, 1, second);
    } else if (max !== 0) {
      // Java FScrollbar(max)
      this.setAll(max, 0, 1, Math.trunc((max + 9) / 10));
    } else {
      // Java FScrollbar()
      this.setAll(0, 0, 0, 0);
    }

    this.listen(this.el, "pointerdown", (ev) => this.onDown(ev as PointerEvent));
    this.listen(this.el, "pointermove", (ev) => this.onMove(ev as PointerEvent));
    this.listen(this.el, "pointerup", () => {
      this.dragging = false;
      if (this.el.hasPointerCapture?.(this.pointerId)) {
        this.el.releasePointerCapture(this.pointerId);
      }
    });
    this.listen(this.el, "pointercancel", () => {
      this.dragging = false;
    });
  }

  /* ------------------------------------------------------------- geometry */

  /** Java `FScrollbar.fixBody()`: split the track into head/body/tail/thumb. */
  private fixBody(): void {
    const w = this.width;
    const h = this.height;
    this.horz = w > h;
    if (this.horz) {
      let sizeThumb = w - 2 * h;
      let sizeHead: number;
      if (sizeThumb < 5) {
        sizeThumb = 0;
        sizeHead = Math.trunc(h / 2);
      } else {
        sizeHead = h;
        if (sizeThumb > h) sizeThumb = h;
      }
      this.headRect = { x: 0, y: 0, width: sizeHead, height: h };
      this.tailRect = { x: w - sizeHead, y: 0, width: sizeHead, height: h };
      this.bodyRect = { x: sizeHead, y: 0, width: w - 2 * sizeHead, height: h };
      this.thumbRect = { x: 0, y: 0, width: sizeThumb, height: h };
      this.setVal(this.iVal);
      return;
    }
    let sizeThumb = h - 2 * w;
    let sizeHead: number;
    if (sizeThumb < 5) {
      sizeThumb = 0;
      sizeHead = Math.trunc(h / 2);
    } else {
      sizeHead = w;
      if (sizeThumb > w) sizeThumb = w;
    }
    this.headRect = { x: 0, y: 0, width: w, height: sizeHead };
    this.tailRect = { x: 0, y: h - sizeHead, width: w, height: sizeHead };
    this.bodyRect = { x: 0, y: sizeHead, width: w, height: h - 2 * sizeHead };
    this.thumbRect = { x: 0, y: 0, width: w, height: sizeThumb };
    this.setVal(this.iVal);
  }

  override setBounds(x: number, y: number, w: number, h: number): void {
    super.setBounds(x, y, w, h);
    this.fixBody();
  }

  /** Position the track parts; called by `setVal` and `setBounds`. */
  protected override layout(): void {
    if (!this.head) return;
    assignRect(this.head, this.headRect);
    assignRect(this.tail, this.tailRect);
    assignRect(this.thumb, this.thumbRect);
  }

  /* --------------------------------------------------------------- value */

  /** Java `FScrollbar.setAll(max, val, step, jump)`. */
  setAll(max: number, val: number, step: number, jump: number): void {
    this.iMax = max;
    this.iJump = jump > max ? max : jump;
    this.iStep = step > jump ? jump : step;
    this.setVal(val);
  }

  /** Java `FScrollbar.setMax(int)`. */
  setMax(newMax: number): void {
    this.iMax = newMax;
    if (this.iMax < 0) this.iMax = 0;
    this.setJump(Math.trunc((this.iMax + 9) / 10));
    this.setStep(Math.trunc((this.iMax + 99) / 100));
    this.setVal(this.iVal);
  }

  /** Java `FScrollbar.setVal(int)` - clamps and repositions the thumb. */
  setVal(newVal: number): void {
    this.iVal = newVal;
    if (this.iVal < 0) this.iVal = 0;
    if (this.iVal > this.iMax) this.iVal = this.iMax;
    if (this.horz) {
      this.thumbRect.x =
        this.headRect.x +
        this.headRect.width +
        (this.iMax < 1
          ? 0
          : Math.trunc(
              (this.iVal *
                (this.width - 2 * this.headRect.width - this.thumbRect.width)) /
                this.iMax,
            ));
    } else {
      this.thumbRect.y =
        this.headRect.y +
        this.headRect.height +
        (this.iMax < 1
          ? 0
          : Math.trunc(
              (this.iVal *
                (this.height - 2 * this.headRect.height - this.thumbRect.height)) /
                this.iMax,
            ));
    }
    this.layout();
  }

  /** Java `FScrollbar.setJump(int)`. */
  setJump(newJump: number): void {
    this.iJump = newJump;
    if (this.iJump > this.iMax) this.iJump = this.iMax;
  }

  /** Java `FScrollbar.setStep(int)`. */
  setStep(newStep: number): void {
    this.iStep = newStep;
    if (this.iStep > this.iMax) this.iStep = this.iMax;
    if (this.iStep > this.iJump) this.iStep = this.iJump;
  }

  /** Java `FScrollbar.getMax()`. */
  getMax(): number {
    return this.iMax;
  }

  /** Java `FScrollbar.getVal()`. */
  getVal(): number {
    return this.iVal;
  }

  /** Java `FScrollbar.getJump()`. */
  getJump(): number {
    return this.iJump;
  }

  /** Java `FScrollbar.getStep()`. */
  getStep(): number {
    return this.iStep;
  }

  /** Java `FScrollbar.getHorz()`. */
  getHorz(): boolean {
    return this.horz;
  }

  /* --------------------------------------------------------- interaction */

  private localCoords(ev: MouseEvent | PointerEvent): { x: number; y: number } {
    const box = this.el.getBoundingClientRect();
    const sx = box.width > 0 ? this.width / box.width : 1;
    const sy = box.height > 0 ? this.height / box.height : 1;
    return {
      x: Math.trunc((ev.clientX - box.left) * sx),
      y: Math.trunc((ev.clientY - box.top) * sy),
    };
  }

  /** Java `FScrollbar.mouseDown(Event, x, y)`. */
  private onDown(ev: PointerEvent): void {
    if (!this.isEnabled()) return;
    const { x, y } = this.localCoords(ev);
    if (inside(this.headRect, x, y)) {
      this.setVal(this.iVal - this.iStep);
      this.changed();
    } else if (inside(this.tailRect, x, y)) {
      this.setVal(this.iVal + this.iStep);
      this.changed();
    } else if (inside(this.thumbRect, x, y)) {
      this.dragging = true;
      this.dragOffset = this.horz ? x - this.thumbRect.x : y - this.thumbRect.y;
      this.pointerId = ev.pointerId;
      this.el.setPointerCapture?.(ev.pointerId);
    } else if (!this.horz && y < this.thumbRect.y) {
      this.setVal(this.iVal - this.iJump);
      this.changed();
    } else if (!this.horz || x >= this.thumbRect.x) {
      this.setVal(this.iVal + this.iJump);
      this.changed();
    } else {
      this.setVal(this.iVal - this.iJump);
      this.changed();
    }
  }

  /** Java `FScrollbar.mouseDrag(Event, x, y)` (thumb follow). */
  private onMove(ev: PointerEvent): void {
    if (!this.dragging) return;
    const { x, y } = this.localCoords(ev);
    let size: number;
    let pos: number;
    if (this.horz) {
      size = this.bodyRect.width - this.thumbRect.width;
      pos = x - this.bodyRect.x - this.dragOffset;
    } else {
      size = this.bodyRect.height - this.thumbRect.height;
      pos = y - this.bodyRect.y - this.dragOffset;
    }
    let value: number;
    if (pos < 0) {
      pos = 0;
      value = 0;
    } else if (size <= 0) {
      value = 0;
    } else if (pos >= size) {
      value = this.iMax;
      pos = size;
    } else {
      value = Math.trunc((this.iMax * pos + Math.trunc(size / 2)) / size);
    }
    this.setVal(value);
    this.changed();
  }

  /** Report a user-driven move to the owner (and optionally the screen). */
  private changed(): void {
    this.onChange?.();
    if (this.dispatch) this.fire();
  }
}

/* ------------------------------------------------------------- text list */

export class FTextList extends Widget {
  private text: string[] | null = null;
  private selectVal = -1;
  private base = 0;
  private canSelect = true;
  private fill: ColorSpec = COLORS.fill;
  private readonly scroll: FScrollbar;
  private readonly rows: HTMLDivElement;

  /** Java overloads: `new FTextList()` and `new FTextList(Font)`. */
  constructor(font: FontName = "textF") {
    super(div("game-list"));
    this.el.style.background = COLORS.fill;
    this.el.style.overflow = "hidden";
    this.el.style.padding = "0";
    this.el.style.cursor = "default";
    applyFont(this.el, font);

    this.rows = div(null);
    this.rows.style.position = "absolute";
    this.rows.style.left = "3px";
    this.rows.style.top = "0";
    this.rows.style.overflow = "hidden";
    this.el.appendChild(this.rows);

    this.scroll = new FScrollbar();
    this.scroll.dispatch = false;
    this.scroll.onChange = () => {
      this.base = this.scroll.getVal();
      this.render();
    };
    this.el.appendChild(this.scroll.el);
    this.scroll.host = null;

    this.setBounds(0, 0, 50, 50);
    this.listen(this.el, "mousedown", (ev) => this.onDown(ev as MouseEvent));
    this.listen(this.el, "wheel", (ev) => this.onWheel(ev as WheelEvent));
  }

  /** Java `FTextList.reshape`: the scrollbar takes the right 12 pixels. */
  override setBounds(x: number, y: number, w: number, h: number): void {
    super.setBounds(x, y, w, h);
    if (!this.scroll) return;
    this.scroll.setBounds(w - 12, 0, 12, h);
    this.rows.style.width = `${Math.max(0, w - 15)}px`;
    this.rows.style.height = `${h}px`;
    this.fixScroller();
    this.render();
  }

  /** Java `FTextList.setCanSelect(boolean)`. */
  setCanSelect(val: boolean): void {
    this.canSelect = val;
  }

  /** Java `FTextList.setFill(Color)` - recolors the chrome. */
  setFill(col: ColorSpec): void {
    this.fill = col;
    applyBevelColors(this.el, col, "in");
    this.el.style.background = col;
    applyBevelColors(this.scroll.el, col, "in");
    this.render();
  }

  /** Java `FTools.getFill` equivalent. */
  getFill(): ColorSpec {
    return this.fill;
  }

  /** Number of rows that fit (Java `FTextList.showLines()`). */
  showLines(): number {
    return Math.trunc(this.height / lineHeight(this.getFont()));
  }

  /* --------------------------------------------------------------- items */

  /** Java `FTextList.addItem(String)` / `addItem(String, int)`. */
  addItem(str: string | null, index?: number): void {
    if (str === null) return;
    if (this.text === null) {
      this.text = [str];
      this.fixScroller();
      this.render();
      return;
    }
    let at = index ?? this.text.length;
    if (at < 0 || at >= this.text.length) at = this.text.length;
    this.text.splice(at, 0, str);
    this.fixScroller();
    this.render();
  }

  /** Java `FTextList.delItem(int)`. */
  delItem(index: number): void {
    if (this.text === null || index < 0 || index >= this.text.length) return;
    if (this.text.length === 1) {
      this.text = null;
      this.selectVal = -1;
      this.fixScroller();
      this.render();
      return;
    }
    this.text.splice(index, 1);
    if (this.selectVal >= this.text.length) this.selectVal = -1;
    this.fixScroller();
    this.render();
  }

  /** Java `FTextList.setItem(String, int)`. */
  setItem(str: string, index: number): void {
    if (this.text === null || index < 0 || index >= this.text.length) return;
    this.text[index] = str;
    this.render();
  }

  /** Java `FTextList.clear()`. */
  clear(): void {
    this.text = null;
    this.selectVal = -1;
    this.base = 0;
    this.fixScroller();
    this.render();
  }

  /**
   * Java `FTextList.setSelect(int)`: returns true when the selection changed.
   * Programmatic calls stay silent - only a mouse click dispatches an action.
   */
  setSelect(index: number): boolean {
    if (!this.canSelect || this.selectVal === index) return false;
    if (this.text === null || index < 0 || index >= this.text.length) {
      this.selectVal = -1;
    } else {
      this.selectVal = index;
    }
    this.render();
    return true;
  }

  /** Java `FTextList.getSelect()`. */
  getSelect(): number {
    return this.selectVal;
  }

  /**
   * Java `FTextList.getItem(int)` returns the *selected* string whatever index
   * is passed (a quirk arPostal relies on); `itemAt(index)` is the literal
   * accessor.
   */
  getItem(_index?: number): string | null {
    if (this.text === null || this.selectVal < 0 || this.selectVal >= this.text.length) {
      return null;
    }
    return this.text[this.selectVal];
  }

  /** The string at an absolute index, or null. */
  itemAt(index: number): string | null {
    if (this.text === null || index < 0 || index >= this.text.length) return null;
    return this.text[index] ?? null;
  }

  /** Number of items (Java had no accessor; shops looped over `itList`). */
  getCount(): number {
    return this.text ? this.text.length : 0;
  }

  /** All items, top to bottom. */
  getItems(): readonly string[] {
    return this.text ?? [];
  }

  /**
   * Java `FTextList.FixScroller()`.
   *
   * Deviation: when the whole list fits (or the list is emptied) the scroll
   * value is reset to 0.  Java left the old value in place while hiding the
   * bar, so a list that had been scrolled and then shrunk (arStatus/Shop call
   * `clear()` before refilling) would paint an empty window with
   * `base > text.length`.
   */
  fixScroller(): void {
    if (this.text === null) {
      this.scroll.show(false);
      this.scroll.setVal(0);
      this.base = 0;
      return;
    }
    const shown = this.showLines();
    if (shown >= this.text.length) {
      this.scroll.show(false);
      this.scroll.setAll(0, 0, 1, 1);
      this.base = 0;
      return;
    }
    this.scroll.setMax(this.text.length - shown);
    this.scroll.show(true);
    this.base = this.scroll.getVal();
  }

  /** Java painted the list from `scroll.getVal()`. */
  override repaint(): void {
    this.fixScroller();
    this.render();
  }

  override setFont(font: FontName): void {
    super.setFont(font);
    applyFont(this.el, font);
    this.fixScroller();
    this.render();
  }

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.render();
  }

  override enable(flag = true): void {
    super.enable(flag);
    this.scroll.enable(flag);
  }

  override mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  private render(): void {
    if (!this.rows) return;
    const font = this.getFont();
    const rowH = lineHeight(font);
    const rows: HTMLElement[] = [];
    if (this.text) {
      const show = this.showLines() + 1;
      for (let i = 0; i < show; i++) {
        const index = this.base + i;
        if (index >= this.text.length) break;
        const row = div(null, this.text[index]);
        row.style.position = "absolute";
        row.style.left = "0";
        row.style.top = `${i * rowH}px`;
        row.style.width = "100%";
        row.style.height = `${rowH}px`;
        row.style.lineHeight = `${rowH}px`;
        row.style.whiteSpace = "pre";
        row.style.overflow = "hidden";
        row.dataset.index = String(index);
        if (index === this.selectVal) {
          // Java filled the selection with `dark` and drew the text in `glow`.
          row.style.background = this.fill === COLORS.fill ? COLORS.dark : shade(this.fill, 1, 2);
          row.style.color = this.fill === COLORS.fill ? COLORS.glow : glowOf(this.fill);
        } else {
          row.style.color = this.getForeground() ?? COLORS.black;
        }
        rows.push(row);
      }
    }
    this.rows.replaceChildren(...rows);
  }

  /** Java `FTextList.mouseDown`: select the row, then post the action. */
  private onDown(ev: MouseEvent | PointerEvent): void {
    if (!this.canSelect || !this.isEnabled()) return;
    const box = this.el.getBoundingClientRect();
    const sy = box.height > 0 ? this.height / box.height : 1;
    const y = Math.trunc((ev.clientY - box.top) * sy);
    const rowH = lineHeight(this.getFont());
    const index = this.base + Math.max(0, Math.trunc((y - 3) / rowH));
    if (this.setSelect(index)) this.fire();
  }

  /** Wheel scrolling moves the window only; Java had no wheel support. */
  private onWheel(ev: WheelEvent): void {
    if (!this.scroll.isShowing()) return;
    const delta = ev.deltaY > 0 ? 1 : -1;
    this.scroll.setVal(this.scroll.getVal() + delta * Math.max(1, this.scroll.getJump()));
  }
}

/** Factory mirroring `new FTextList()` + `reshape`. */
export function textList(x: number, y: number, w: number, h: number, font: FontName = "textF"): FTextList {
  const list = new FTextList(font);
  list.reshape(x, y, w, h);
  return list;
}
