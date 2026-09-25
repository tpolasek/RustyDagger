/**
 * Portrait - the DOM rewrite of `DCourt.Components.Portrait`.
 *
 * Java: a Canvas drawing an image (stretched into its bounds) plus a 1px black
 * border, an optional caption under the box (SUBTEXT) or a white, word-wrapped
 * label over the image (SUPERTEXT).  Clicking one posts `Event(1001)` so the
 * enclosing Screen's `action` method can compare `e.target` (see
 * `arField.action`'s `switch (getPic(e.target))`).
 *
 * DOM: a `.portrait` div holding an `<img>`; the caption is a *sibling*
 * element, because Java paints SUBTEXT on the parent graphics just below the
 * box, outside the box's clipping region.  SUPERTEXT uses the `.portrait-overlay`
 * strip from styles.css and lets CSS wrap the text (Java used `Breaker`).
 */

import { type ColorSpec, color, div, fontCss } from "./dom";
import { Widget } from "./widget";
import { loadImage, setArtSrc } from "./resources";

export class Portrait extends Widget {
  static readonly NOTEXT = 0;
  static readonly SUBTEXT = 1;
  static readonly SUPERTEXT = 2;

  private img: HTMLImageElement;
  private overlay: HTMLDivElement;
  private captionEl: HTMLDivElement | null = null;
  private iconPath: string | null = null;
  private text: string | null = null;
  private type: number = Portrait.SUBTEXT;
  private textColor: ColorSpec = color(0, 0, 0);

  /**
   * Supports all three Java constructors:
   *   new Portrait()                          -> no image, no text
   *   new Portrait(where, x, y, w, h)
   *   new Portrait(where, msg, x, y, w, h)
   */
  constructor(
    where: string | null = null,
    label?: string | number | null,
    x?: number,
    y?: number,
    w?: number,
    h?: number,
  ) {
    super(div("portrait"));

    this.img = document.createElement("img");
    this.img.alt = "";
    this.img.decoding = "async";
    this.el.appendChild(this.img);

    this.overlay = div("portrait-overlay");
    this.overlay.style.display = "none";
    this.overlay.style.whiteSpace = "pre-wrap";
    this.overlay.style.wordBreak = "break-word";
    this.el.appendChild(this.overlay);

    if (typeof label === "number") {
      // Java (where, x, y, w, h)
      this.setBounds(label, x ?? 0, y ?? 0, w ?? 0);
    } else {
      this.text = label ?? null;
      this.setBounds(x ?? 0, y ?? 0, w ?? 0, h ?? 0);
    }
    if (where) this.setIcon(where);

    this.el.style.cursor = "pointer";
    this.listen(this.el, "click", () => this.fire());
    this.refresh();
  }

  /* ------------------------------------------------------------ content */

  /** Replace the art (Java loaded it in the constructor via `Tools.loadImage`). */
  setIcon(where: string | null): void {
    this.iconPath = where;
    if (!where) {
      this.img.removeAttribute("src");
      return;
    }
    // `loadImage` caches elements: prime the cache, then give this portrait its
    // own `<img>` for the same art (a cached element can only live in one
    // parent).  `setArtSrc` carries the variant-falls-back-to-jpg behaviour.
    loadImage(where);
    setArtSrc(this.img, where);
  }

  /** Java `Portrait.getIcon()`; null when this portrait has no art. */
  getIcon(): HTMLImageElement | null {
    return this.iconPath ? this.img : null;
  }

  /** The art path this portrait was built from (`null` when imageless). */
  getIconPath(): string | null {
    return this.iconPath;
  }

  /** Java `Portrait.setType` (NOTEXT / SUBTEXT / SUPERTEXT). */
  setType(val: number): void {
    this.type = val;
    this.refresh();
  }

  /** Current caption mode. */
  getType(): number {
    return this.type;
  }

  /** Java `Portrait.setText`. */
  setText(msg: string | null): void {
    this.text = msg;
    this.refresh();
  }

  /** Java `Portrait.getText`. */
  getText(): string | null {
    return this.text;
  }

  /** True when the current type + text actually renders a label. */
  hasCaption(): boolean {
    return this.type !== Portrait.NOTEXT && this.text !== null && this.text.length > 0;
  }

  /* -------------------------------------------------------------- style */

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.textColor = col;
    this.refresh();
  }

  override show(flag = true): void {
    super.show(flag);
    if (this.captionEl) this.captionEl.style.display = flag ? "" : "none";
  }

  /* --------------------------------------------------------- DOM layout */

  /** The box plus its sibling caption (Java painted both from the panel). */
  override mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
    if (this.captionEl) parent.appendChild(this.captionEl);
  }

  override unmount(): void {
    this.captionEl?.remove();
    this.captionEl = null;
    super.unmount();
  }

  /** Java repainted the portrait after `setText`/`setType`/`reshape`. */
  override repaint(): void {
    this.refresh();
  }

  override setBounds(x: number, y: number, w: number, h: number): void {
    super.setBounds(x, y, w, h);
    this.refresh();
  }

  private refresh(): void {
    if (!this.overlay) return;
    const hasText = this.hasCaption();

    const showOverlay = this.type === Portrait.SUPERTEXT && hasText;
    this.overlay.style.display = showOverlay ? "" : "none";
    this.overlay.style.color = "#ffffff";
    this.overlay.textContent = showOverlay ? (this.text ?? "") : "";

    if (this.type === Portrait.SUBTEXT && hasText) {
      if (!this.captionEl) {
        const caption = div("portrait-caption");
        // Java draws this below the box, in the panel's font, without chrome.
        caption.style.position = "absolute";
        caption.style.bottom = "auto";
        caption.style.right = "auto";
        caption.style.background = "transparent";
        caption.style.padding = "0";
        caption.style.pointerEvents = "none";
        caption.style.whiteSpace = "pre";
        caption.style.font = fontCss("textF");
        caption.style.textAlign = "center";
        this.captionEl = caption;
      }
      const b = this.getBounds();
      this.captionEl.textContent = this.text ?? "";
      this.captionEl.style.left = `${b.x}px`;
      this.captionEl.style.top = `${b.y + b.height}px`;
      this.captionEl.style.width = `${b.width}px`;
      this.captionEl.style.color = this.textColor;
      this.captionEl.style.display = this.isShowing() ? "" : "none";
      const parent = this.el.parentElement;
      if (parent && this.captionEl.parentElement !== parent) parent.appendChild(this.captionEl);
    } else if (this.captionEl) {
      this.captionEl.remove();
      this.captionEl = null;
    }
  }
}

/** Factory mirroring `new Portrait(where, msg, x, y, w, h)`. */
export function portrait(
  where: string | null,
  msg: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
): Portrait {
  return new Portrait(where, msg, x, y, w, h);
}
