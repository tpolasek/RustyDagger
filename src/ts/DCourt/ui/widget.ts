/**
 * Shared widget plumbing for the DOM UI.
 *
 * Java components (Button, Checkbox, FTextList, Portrait, Options ...) all
 * extend `java.awt.Component` and communicate by bubbling `Event(1001)` up to
 * the enclosing Screen, which dispatches in its `action(Event e, Object o)`
 * method by comparing `e.target`.  The DOM port keeps that dispatch style: a
 * widget fires `host.action({ id: 1001, target: this, x, y })`, so ported
 * screens can keep writing `if (e.target === this.save) { ... }`.
 */

import { type ColorSpec, type FontName, type RectLike, applyColors, applyFont, assignRect } from "./dom";

/** Java `Event.id` values the game actually uses. */
export const EVENT_ACTION = 1001;
export const EVENT_MOUSE_DOWN = 501;
export const EVENT_MOUSE_UP = 502;
export const EVENT_MOUSE_MOVE = 503;

/** Minimal stand-in for `java.awt.Event`. */
export interface GameEvent {
  readonly target: unknown;
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly arg?: unknown;
}

/** Build a game event (used by widgets and by Screen's own dispatch). */
export function gameEvent(target: unknown, id = EVENT_ACTION, x = 0, y = 0, arg?: unknown): GameEvent {
  return arg === undefined ? { target, id, x, y } : { target, id, x, y, arg };
}

/** Anything a widget can attach itself to and dispatch actions through. */
export interface ActionHost {
  action(e: GameEvent, o?: unknown): boolean;
}

/**
 * Base class for every ported AWT component.
 *
 * Subclasses own their `el` (or `el` plus extra elements, see `Portrait`) and
 * are responsible for `mount()`ing those elements into the screen root.
 */
export abstract class Widget {
  /** Primary DOM node; absolute positioning is applied by `reshape`. */
  readonly el: HTMLElement;
  /** Screen this widget dispatches into; set by `Screen.add`. */
  host: ActionHost | null = null;
  /** Optional per-widget listener, used in addition to `host.action`. */
  onAction: ((widget: Widget) => void) | null = null;
  /** Optional repaint hook for widgets whose content is read from game state. */
  onRepaint: (() => void) | null = null;

  private readonly abort = new AbortController();
  private rectX = 0;
  private rectY = 0;
  private rectW = 0;
  private rectH = 0;
  private visible = true;
  private enabled = true;
  private font: FontName = "textF";
  private foreground: ColorSpec | null = null;
  private background: ColorSpec | null = null;

  protected constructor(element: HTMLElement) {
    this.el = element;
    this.el.style.position = "absolute";
    // AWT delivered a mouse-down to the deepest component, which consumed it:
    // a click on a widget never reached the screen's background handler (the
    // one that calls `down(x, y)`).  Keep that behaviour for every widget.
    this.listen(this.el, "mousedown", () => {});
  }

  /* ---------------------------------------------------------- geometry */

  /** Java `Component.reshape`. Accepts a rect or x/y/w/h. */
  reshape(r: RectLike): void;
  reshape(x: number, y: number, w?: number, h?: number): void;
  reshape(xOrRect: number | RectLike, y?: number, w?: number, h?: number): void {
    if (typeof xOrRect === "object") {
      this.setBounds(xOrRect.x, xOrRect.y, xOrRect.width, xOrRect.height);
    } else {
      this.setBounds(xOrRect, y ?? 0, w ?? this.rectW, h ?? this.rectH);
    }
  }

  /** Java `Component.setBounds`. */
  setBounds(x: number, y: number, w: number, h: number): void {
    this.rectX = x;
    this.rectY = y;
    this.rectW = w;
    this.rectH = h;
    assignRect(this.el, { x, y, width: w, height: h });
    this.layout();
  }

  /** Java `Component.bounds()`. */
  getBounds(): RectLike {
    return { x: this.rectX, y: this.rectY, width: this.rectW, height: this.rectH };
  }

  get x(): number {
    return this.rectX;
  }

  get y(): number {
    return this.rectY;
  }

  get width(): number {
    return this.rectW;
  }

  get height(): number {
    return this.rectH;
  }

  /** Hook for widgets with child elements that need repositioning. */
  protected layout(): void {}

  /* ------------------------------------------------------------- style */

  /** Java `Component.setFont`. Takes a styles.css font slot name. */
  setFont(font: FontName): void {
    applyFont(this.el, font);
    this.font = font;
    this.layout();
  }

  /** The widget's current font slot. */
  getFont(): FontName {
    return this.font;
  }

  /** Java `Component.setForeground`. */
  setForeground(col: ColorSpec): void {
    applyColors(this.el, col, null);
    this.foreground = col;
  }

  /** Java `Component.setBackground`. */
  setBackground(col: ColorSpec): void {
    applyColors(this.el, null, col);
    this.background = col;
  }

  /** Current foreground (may be null when unset). */
  getForeground(): ColorSpec | null {
    return this.foreground;
  }

  /** Current background (may be null when unset). */
  getBackground(): ColorSpec | null {
    return this.background;
  }

  /* ------------------------------------------------------------ state */

  /** Java `Component.show(boolean)` / `show()`. */
  show(flag = true): void {
    this.visible = flag;
    this.el.style.display = flag ? "" : "none";
  }

  /** Java `Component.hide()`. */
  hide(): void {
    this.show(false);
  }

  /** Java `Component.isVisible()`. */
  isShowing(): boolean {
    return this.visible;
  }

  /** Java `Component.enable(boolean)`. */
  enable(flag = true): void {
    this.enabled = flag;
    if (flag) this.el.removeAttribute("disabled");
    else this.el.setAttribute("disabled", "disabled");
    this.el.style.opacity = flag ? "" : "0.55";
  }

  /** Java `Component.disable()`. */
  disable(): void {
    this.enable(false);
  }

  /** Java `Component.isEnabled()`. */
  isEnabled(): boolean {
    return this.enabled;
  }

  /* ------------------------------------------------------- interaction */

  /** Mount this widget (and any auxiliary elements) into a parent node. */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  /** Remove the widget's DOM from the document. */
  unmount(): void {
    this.el.remove();
  }

  /** Ask the host to repaint; widgets with derived content override this. */
  repaint(): void {
    this.onRepaint?.();
  }

  /** Dispatch an action to the host (Java `postEvent(new Event(this, 1001))`). */
  protected fire(o?: unknown, id = EVENT_ACTION, x = 0, y = 0): void {
    this.onAction?.(this);
    this.host?.action(gameEvent(this, id, x, y), o);
  }

  /** Wire a DOM listener that consumes the event and dies with the widget. */
  protected listen(
    target: EventTarget,
    type: string,
    handler: (ev: Event) => void,
    stop = true,
  ): void {
    target.addEventListener(
      type,
      (ev: Event) => {
        if (stop) ev.stopPropagation();
        handler(ev);
      },
      { signal: this.abort.signal },
    );
  }

  /** Detach every listener registered through `listen`. */
  destroy(): void {
    this.abort.abort();
  }
}
