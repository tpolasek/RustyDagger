/**
 * Low level DOM helpers for the browser port of Dragon Court.
 *
 * The Java game builds AWT components inside a fixed 400x300 Panel and paints
 * with absolute coordinates.  This module provides the equivalents: logical
 * pixel rectangles, font names that map onto the classes in styles.css, color
 * helpers accepting the same primary colors the Java sources used, and the
 * bevel chrome (the FTLools/DrawTools sink + bar primitives).
 *
 * Everything here is dependency free and safe to import from any UI module.
 * This module never imports DCourt.Tools (the dependency direction is
 * Tools -> ui, never the other way around) so no import cycles can form.
 */

/** Logical stage size, mirroring DCourt.Tools.DEFAULT_WIDTH/HEIGHT. */
export const DEFAULT_WIDTH = 400;
export const DEFAULT_HEIGHT = 300;

/* ------------------------------------------------------------------ fonts */

/** Font slot names; each maps onto a `.courtF`-style class in styles.css. */
export const FONT_NAMES = [
  "courtF",
  "questF",
  "statusF",
  "fieldF",
  "fightF",
  "boldF",
  "textF",
  "bigF",
  "giantF",
] as const;

export type FontName = (typeof FONT_NAMES)[number];

export interface FontMetrics {
  /** CSS font size in logical pixels. */
  readonly size: number;
  /** Baseline offset from the top of the text box, used to convert Java
   *  `drawString` baselines into CSS `top` values. */
  readonly ascent: number;
  /** Full line height, used for text lists / option rows. */
  readonly lineHeight: number;
  /** The `font` shorthand exactly as declared in styles.css. */
  readonly css: string;
}

/**
 * Metrics for the classes declared in styles.css.  Java used `FontMetrics`
 * from the AWT toolkit; the DOM gets fixed values instead, sized from the CSS
 * classes so callers can keep using Java baselines as `top - ascent`.
 */
export const FONT_METRICS: Readonly<Record<FontName, FontMetrics>> = {
  courtF: { size: 12, ascent: 9, lineHeight: 14, css: 'italic bold 12px "Times New Roman", serif' },
  questF: { size: 12, ascent: 9, lineHeight: 14, css: "bold 12px Arial, Helvetica, sans-serif" },
  statusF: { size: 10, ascent: 8, lineHeight: 12, css: "bold 10px Arial, Helvetica, sans-serif" },
  fieldF: { size: 12, ascent: 9, lineHeight: 14, css: "12px Arial, Helvetica, sans-serif" },
  fightF: { size: 11, ascent: 8, lineHeight: 13, css: 'bold 11px "Times New Roman", serif' },
  boldF: { size: 12, ascent: 9, lineHeight: 14, css: "bold 12px Arial, Helvetica, sans-serif" },
  textF: { size: 11, ascent: 8, lineHeight: 13, css: "11px Arial, Helvetica, sans-serif" },
  bigF: { size: 16, ascent: 12, lineHeight: 19, css: 'bold 16px "Times New Roman", serif' },
  giantF: { size: 24, ascent: 18, lineHeight: 28, css: 'bold 24px "Times New Roman", serif' },
};

/** `font` CSS shorthand for a slot. */
export function fontCss(font: FontName): string {
  return FONT_METRICS[font].css;
}

/** Baseline offset (Java `FontMetrics.getAscent`). */
export function fontAscent(font: FontName): number {
  return FONT_METRICS[font].ascent;
}

/** Full line height (Java `FontMetrics.getHeight`). */
export function lineHeight(font: FontName): number {
  return FONT_METRICS[font].lineHeight;
}

/** Approximate text width, used where a Java screen measured a string. */
export function textWidth(msg: string, font: FontName): number {
  const m = FONT_METRICS[font];
  // Arial/Times average glyph width is a little over half of the em size;
  // 0.52 em is close enough for centering the few strings Java measured.
  return Math.round(msg.length * m.size * 0.52);
}

/** Convert a Java baseline `y` into a CSS `top` for the given font slot. */
export function baselineTop(font: FontName, baselineY: number): number {
  return baselineY - fontAscent(font);
}

/* ----------------------------------------------------------------- colors */

/** A CSS color string, e.g. the result of {@link color}. */
export type ColorSpec = string;

const HEX = (n: number): string => n.toString(16).padStart(2, "0");

/** Build a CSS color from 0-255 components, mirroring `new java.awt.Color`. */
export function color(r: number, g: number, b: number): ColorSpec {
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return `#${HEX(c(r))}${HEX(c(g))}${HEX(c(b))}`;
}

/** Colors used by the FTLools / DrawTools chrome. */
export const COLORS = {
  white: "#ffffff",
  black: "#000000",
  fill: "#c0c0c0",
  glow: "#e0e0e0",
  dull: "#808080",
  dark: "#606060",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ff8000",
  lightGray: "#c0c0c0",
} as const;

const NAMED: Readonly<Record<string, string>> = {
  white: "#ffffff",
  black: "#000000",
  gray: "#808080",
  grey: "#808080",
  lightgray: "#c0c0c0",
  lightgrey: "#c0c0c0",
  darkgray: "#606060",
  darkgrey: "#606060",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ff8000",
};

/** Parse the colors Java sources used (`new Color(r,g,b)` results, hex, names). */
export function parseColor(spec: ColorSpec | null | undefined): { r: number; g: number; b: number } | null {
  if (!spec) return null;
  const val = String(spec).trim().toLowerCase();
  const named = NAMED[val];
  if (named !== undefined) return parseColor(named);
  if (val.startsWith("#")) {
    const hex = val.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  return null;
}

/** Scale a color by `num/den` (Java FTLools.setFill derived dull/dark this way). */
export function shade(spec: ColorSpec, num: number, den: number): ColorSpec {
  const rgb = parseColor(spec);
  if (!rgb) return spec;
  return color((rgb.r * num) / den, (rgb.g * num) / den, (rgb.b * num) / den);
}

/** Blend a color towards white: `(256 + c) / 2`, as FTLools did for `glow`. */
export function glowOf(spec: ColorSpec): ColorSpec {
  const rgb = parseColor(spec);
  if (!rgb) return spec;
  return color((256 + rgb.r) / 2, (256 + rgb.g) / 2, (256 + rgb.b) / 2);
}

/* ------------------------------------------------------------------ rects */

/** Java `java.awt.Rectangle` stand-in. */
export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Build a rect (mirrors `new Rectangle(x, y, w, h)` in the screens). */
export function rect(x: number, y: number, width: number, height: number): RectLike {
  return { x, y, width, height };
}

/** Java `Rectangle.inside(x, y)`. */
export function inside(r: RectLike, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height;
}

/* --------------------------------------------------------------- elements */

/** Create an element with an optional class list and inline style. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string | null,
  style?: Partial<CSSStyleDeclaration> | null,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (style) Object.assign(node.style, style);
  return node;
}

/** Create a positioned `<div>` holding `text` (if any). */
export function div(className?: string | null, text?: string | null): HTMLDivElement {
  const node = el("div", className ?? null);
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/** Absolute position/size an element; `w`/`h` are optional. */
export function assignRect(node: HTMLElement, r: RectLike): void {
  node.style.position = "absolute";
  node.style.left = `${r.x}px`;
  node.style.top = `${r.y}px`;
  node.style.width = `${r.width}px`;
  node.style.height = `${r.height}px`;
}

/** Apply (or replace) the font class of an element. */
export function applyFont(node: HTMLElement, font: FontName | null | undefined): void {
  for (const name of FONT_NAMES) node.classList.remove(name);
  if (font) {
    node.classList.add(font);
    node.style.font = fontCss(font);
  }
}

/** Set foreground and/or background colors. */
export function applyColors(
  node: HTMLElement,
  fg?: ColorSpec | null,
  bg?: ColorSpec | null,
): void {
  if (fg !== undefined && fg !== null) node.style.color = fg;
  if (bg !== undefined && bg !== null) node.style.background = bg;
}

/**
 * Recolored bevel chrome for a custom fill color (FTools.setFill semantics:
 * dull = 2/3, dark = 1/2, glow = (256+c)/2).
 */
export function applyBevelColors(node: HTMLElement, fill: ColorSpec, kind: "out" | "in"): void {
  const dark = shade(fill, 1, 2);
  const glow = glowOf(fill);
  node.classList.remove("bevel-out", "bevel-in");
  node.classList.add(kind === "out" ? "bevel-out" : "bevel-in");
  node.style.background = fill;
  node.style.borderStyle = "solid";
  node.style.borderWidth = "1px";
  node.style.borderColor =
    kind === "out" ? `${glow} ${dark} ${dark} ${glow}` : `${dark} ${glow} ${glow} ${dark}`;
  node.dataset.fill = fill;
}

/** Sink (inset) chrome box, replacing `DrawTools.sink` / `FTools.drawSink`. */
export function sink(node: HTMLElement, bg?: ColorSpec | null): HTMLElement {
  node.classList.add("bevel-in");
  if (bg !== undefined && bg !== null) node.style.background = bg;
  return node;
}

/** Bar (outset) chrome box, replacing `DrawTools.bar` / `FTools.drawBar`. */
export function bar(node: HTMLElement, bg?: ColorSpec | null): HTMLElement {
  node.classList.add("bevel-out");
  if (bg !== undefined && bg !== null) node.style.background = bg;
  return node;
}

/** Positioned empty chrome box; the caller decides sink (in) or bar (out). */
export function boxEl(x: number, y: number, w: number, h: number, kind: "in" | "out" = "in"): HTMLDivElement {
  const node = div(kind === "in" ? "bevel-in" : "bevel-out");
  assignRect(node, rect(x, y, w, h));
  node.style.borderRadius = "0";
  return node;
}

/* ------------------------------------------------------------- text nodes */

export type TextAlignSpec = "left" | "center" | "right";

export interface TextOptions {
  /** Font slot, defaulting to the host screen's current font. */
  font?: FontName;
  /** Text color, defaulting to the host screen's foreground. */
  color?: ColorSpec;
  /** `center` / `right` position the string relative to `x` like DrawTools. */
  align?: TextAlignSpec;
  /** When false, `y` is a CSS `top` instead of a Java baseline. */
  baseline?: boolean;
  /** Optional background highlight behind the text. */
  background?: ColorSpec;
  /** Optional fixed width (needed with `align: "center"` + wrapping text). */
  width?: number;
  /** Allow the browser to wrap long strings. */
  wrap?: boolean;
}

/** A positioned, absolutely placed span; Java `g.drawString` equivalent. */
export function textEl(msg: string, x: number, y: number, opts: TextOptions = {}): HTMLDivElement {
  const font = opts.font ?? "textF";
  const node = div("game-label", msg);
  node.style.position = "absolute";
  node.style.left = `${x}px`;
  node.style.top = `${baselineTop(font, y)}px`;
  node.style.whiteSpace = opts.wrap ? "pre-wrap" : "pre";
  node.style.pointerEvents = "none";
  if (opts.width !== undefined) node.style.width = `${opts.width}px`;
  if (opts.align === "center") node.style.transform = "translateX(-50%)";
  else if (opts.align === "right") node.style.transform = "translateX(-100%)";
  if (opts.background) node.style.background = opts.background;
  if (opts.baseline === false) node.style.top = `${y}px`;
  applyFont(node, font);
  if (opts.color) node.style.color = opts.color;
  return node;
}
