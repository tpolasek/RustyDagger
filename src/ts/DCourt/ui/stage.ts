/**
 * The stage: the browser stand-in for `DCourtApplet` + the 400x300 Panel.
 *
 * Responsibilities (see `DCourtApplet.setRegion`, `DCourtApplet.java:93`):
 *  - own the `#stage` element and swap the active Screen in and out;
 *  - translate client coordinates into logical stage coordinates (index.html
 *    scales the stage with `transform: scale(2)`, so a raw `offsetX` is not
 *    trustworthy);
 *  - block input during a region swap and drop focus from inputs that are
 *    about to disappear.
 */

import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "./dom";
import type { Screen } from "./screen";

/** Coordinate pair in logical (400x300) stage space. */
export interface StagePoint {
  x: number;
  y: number;
}

export class Stage {
  static readonly WIDTH = DEFAULT_WIDTH;
  static readonly HEIGHT = DEFAULT_HEIGHT;

  /** The element that holds the current screen. */
  readonly el: HTMLElement;

  private region: Screen | null = null;

  constructor(el?: HTMLElement | string | null) {
    this.el = Stage.resolveElement(el);
    this.el.style.position = this.el.style.position || "relative";
    this.el.style.overflow = this.el.style.overflow || "hidden";
    this.el.style.width = this.el.style.width || `${DEFAULT_WIDTH}px`;
    this.el.style.height = this.el.style.height || `${DEFAULT_HEIGHT}px`;
    this.el.dataset.stage = "true";
    this.el.addEventListener("mousedown", this.onBackgroundDown, true);
  }

  private static resolveElement(el?: HTMLElement | string | null): HTMLElement {
    if (el instanceof HTMLElement) return el;
    const found = document.getElementById(typeof el === "string" ? el : "stage");
    if (found) return found;
    const created = document.createElement("div");
    created.id = typeof el === "string" ? el : "stage";
    document.body.appendChild(created);
    return created;
  }

  private static instance: Stage | null = null;

  /** Install (or fetch) the process-wide stage. */
  static install(el?: HTMLElement | string | null): Stage {
    if (!Stage.instance) Stage.instance = new Stage(el);
    else if (el instanceof HTMLElement && Stage.instance.el !== el) Stage.instance = new Stage(el);
    return Stage.instance;
  }

  /** The installed stage, if `install()` has run (or `#stage` exists). */
  static get current(): Stage | null {
    if (Stage.instance) return Stage.instance;
    const existing = document.getElementById("stage");
    return existing ? Stage.install(existing) : null;
  }

  /* ------------------------------------------------------- region swap */

  /**
   * `DCourtApplet.setRegion`: replace the active screen.
   *
   * Note the Java semantics: re-selecting the *same* screen instance still
   * re-runs `init()` (arQuest does `setRegion(this)` mid-battle so the level-up
   * and portrait updates in overridden `init()` methods fire again).  Widgets
   * are never destroyed here - a screen kept as `home` may be shown again.
   */
  setRegion(next: Screen | null): void {
    if (!next) return;
    this.el.style.pointerEvents = "none";
    this.region = next;
    this.dropFocus();
    this.el.replaceChildren();
    next.root.replaceChildren();
    next.init();
    if (this.region !== next) {
      this.el.style.pointerEvents = "";
      return;
    }
    this.el.appendChild(next.root);
    next.repaint();
    this.el.style.pointerEvents = "";
  }

  /** Current screen (`Tools.getRegion()`). */
  getRegion(): Screen | null {
    return this.region;
  }

  /** `Tools.movedAway(test)`: did the region change since `test` was shown? */
  movedAway(test: unknown): boolean {
    return test !== this.region;
  }

  /** Repaint the current screen (`Tools.repaint()`). */
  repaint(): void {
    this.region?.repaint();
  }

  /* --------------------------------------------------- input handling */

  private dropFocus(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && this.el.contains(active)) active.blur();
  }

  private readonly onBackgroundDown = (ev: Event): void => {
    const target = ev.target;
    if (target instanceof HTMLElement && this.el.contains(target)) {
      // A click on the stage chrome (not inside the screen) only drops focus.
      if (!this.region || !this.region.root.contains(target)) this.dropFocus();
    }
  };

  /**
   * Convert a mouse event into logical stage coordinates.  Works with the CSS
   * `scale()` transform applied to `#stage` because it scales the bounding
   * rect, never the raw `offsetX`.
   */
  coords(ev: MouseEvent, frame?: HTMLElement): StagePoint {
    const box = (frame ?? this.el).getBoundingClientRect();
    const sx = box.width > 0 ? DEFAULT_WIDTH / box.width : 1;
    const sy = box.height > 0 ? DEFAULT_HEIGHT / box.height : 1;
    return {
      x: Math.floor((ev.clientX - box.left) * sx),
      y: Math.floor((ev.clientY - box.top) * sy),
    };
  }
}

/** Install the stage (`main.ts` calls this once before the first setRegion). */
export function installStage(el?: HTMLElement | string | null): Stage {
  return Stage.install(el);
}

/**
 * Convert a mouse event into logical coordinates relative to `frame`
 * (usually a screen's root).  Screens use this for `down(x, y)` map routing.
 */
export function coordsIn(ev: MouseEvent, frame: HTMLElement): StagePoint {
  const stage = Stage.current;
  if (stage) return stage.coords(ev, frame);
  const box = frame.getBoundingClientRect();
  return { x: Math.floor(ev.clientX - box.left), y: Math.floor(ev.clientY - box.top) };
}

/** The installed stage, or null when the UI has not booted yet. */
export function getStage(): Stage | null {
  return Stage.current;
}

/** `Tools.setRegion(next)`. */
export function setRegion(next: Screen | null): void {
  const stage = Stage.current;
  if (!stage) {
    console.warn("[DCourt] setRegion before the stage was installed; region dropped");
    return;
  }
  stage.setRegion(next);
}

/** `Tools.getRegion()`. */
export function getRegion(): Screen | null {
  return Stage.current?.getRegion() ?? null;
}

/** `Tools.movedAway(test)`. */
export function movedAway(test: unknown): boolean {
  const stage = Stage.current;
  if (!stage) return false;
  return stage.movedAway(test);
}

/** `Tools.repaint()` - repaint the current region. */
export function repaintRegion(): void {
  Stage.current?.repaint();
}

/**
 * `instanceof arMound` / `instanceof arHills` style checks for code that must
 * not import concrete screens (StatusPic's light-source line).
 *
 * A screen may declare `kind = "arMound"` explicitly; otherwise the constructor
 * name is used, which is what the Java `instanceof` tested.
 */
export function regionIs(kind: string): boolean {
  const region = Stage.current?.getRegion() as { kind?: string } | null | undefined;
  if (!region) return false;
  const declared = region.kind;
  if (declared !== undefined) return declared === kind;
  return region.constructor.name === kind;
}
