/**
 * FTextArea - the DOM rewrite of `DCourt.Components.FTextArea`
 * (an `java.awt.TextArea` with a maximum length).  Used by arScribe for
 * composing notes and postcards.
 *
 * Java clamped the text in `handleEvent` after every event and moved the caret
 * to the end; the DOM does the same in an `input` listener.
 */

import { type ColorSpec, type FontName, applyFont } from "./dom";
import { Widget } from "./widget";

export class FTextArea extends Widget {
  private max: number;
  private area: HTMLTextAreaElement;

  /**
   * Java overloads:
   *   new FTextArea()
   *   new FTextArea(len)
   */
  constructor(len = 0) {
    super(document.createElement("textarea"));
    this.area = this.el as HTMLTextAreaElement;
    this.area.className = "game-textarea";
    this.area.spellcheck = false;
    this.max = len;
    this.applyMax();
    this.listen(this.area, "input", () => this.clamp());
  }

  private applyMax(): void {
    if (this.max > 0) this.area.maxLength = this.max;
    else this.area.removeAttribute("maxlength");
  }

  private clamp(): void {
    if (this.max > 0 && this.area.value.length > this.max) {
      this.area.value = this.area.value.substring(0, this.max);
      this.select(this.max, this.max);
    }
  }

  /** Java `TextArea.getText()`. */
  getText(): string {
    return this.area.value;
  }

  /** Java `TextArea.setText(String)`. */
  setText(text: string): void {
    this.area.value = text;
  }

  /** Java `FTextArea.setSize(int)` - the maximum length, not pixels. */
  setSize(len: number): void {
    this.max = len;
    this.applyMax();
  }

  /** Current maximum length. */
  getMaxLength(): number {
    return this.max;
  }

  /** Java `TextArea.select(int, int)`; the no-arg form selects everything. */
  select(start?: number, end?: number): void {
    if (start === undefined || end === undefined) {
      this.area.select();
      return;
    }
    this.area.setSelectionRange(start, end);
  }

  /** Java `TextArea.append(String)`. */
  append(text: string): void {
    this.area.value += text;
  }

  /** Java `TextArea.isEditable` / `setEditable`. */
  setEditable(flag: boolean): void {
    this.area.readOnly = !flag;
  }

  /** Read-only variant used for read-only transcripts. */
  isEditable(): boolean {
    return !this.area.readOnly;
  }

  /** Java `Component.requestFocus()`. */
  focus(): void {
    this.area.focus();
  }

  override setFont(font: FontName): void {
    super.setFont(font);
    applyFont(this.area, font);
  }

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.area.style.color = col;
  }

  override setBackground(col: ColorSpec): void {
    super.setBackground(col);
    this.area.style.background = col;
  }

  override enable(flag = true): void {
    super.enable(flag);
    this.area.disabled = !flag;
  }
}

/** Factory mirroring `new FTextArea(len)` + `reshape` + `setText`. */
export function textArea(
  len: number,
  x: number,
  y: number,
  w: number,
  h: number,
  text = "",
): FTextArea {
  const area = new FTextArea(len);
  area.setText(text);
  area.reshape(x, y, w, h);
  return area;
}
