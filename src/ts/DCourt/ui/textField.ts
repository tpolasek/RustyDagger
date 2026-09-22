/**
 * FTextField - the DOM rewrite of `DCourt.Components.FTextField`
 * (an `java.awt.TextField` with a maximum length and an echo character).
 *
 * Java usage (arEntry, arPeer, arPackage, arBuild, arClanHall):
 *   new FTextField(15)                 // max length 15
 *   new FTextField("name", 15)
 *   field.setText(...), field.getText(), field.isMatch(test)
 *   field.setEchoCharacter('*')        // password field
 *   field.addKeyListener(...)          // arEntry refreshes its portrait
 *
 * DOM: an `<input class="game-input">`.  `maxLength` clamps typing, and an
 * `input` listener clamps paste/dropped text just like Java's `postEvent`.
 * Enter reports through `fire()` (the old `TextField` action event) and the
 * optional `onEnter`/`onInput` callbacks cover arEntry's key listeners.
 */

import { type ColorSpec, type FontName, applyFont } from "./dom";
import { Widget } from "./widget";

export class FTextField extends Widget {
  private max: number;
  private input: HTMLInputElement;
  private echoChar: string | null = null;
  /** Java `addKeyListener` / Enter notification. */
  onEnter: (() => void) | null = null;
  /** Fires on every keystroke (arEntry's `keyPressed` -> portrait refresh). */
  onInput: (() => void) | null = null;

  /**
   * Java overloads:
   *   new FTextField()
   *   new FTextField(len)
   *   new FTextField(text, len)
   */
  constructor(textOrLen?: string | number, len = 0) {
    super(document.createElement("input"));
    this.input = this.el as HTMLInputElement;
    this.input.type = "text";
    this.input.className = "game-input";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;

    if (typeof textOrLen === "string") {
      this.input.value = textOrLen;
      this.max = len;
    } else {
      this.max = textOrLen ?? 0;
    }
    this.applyMax();

    this.listen(this.input, "input", () => {
      this.clamp();
      this.onInput?.();
    });
    this.listen(this.input, "keydown", (ev) => {
      if ((ev as KeyboardEvent).key !== "Enter") return;
      this.clamp();
      this.onEnter?.();
      this.fire();
    });
  }

  private applyMax(): void {
    if (this.max > 0) this.input.maxLength = this.max;
    else this.input.removeAttribute("maxlength");
  }

  private clamp(): void {
    if (this.max > 0 && this.input.value.length > this.max) {
      this.input.value = this.input.value.substring(0, this.max);
    }
  }

  /** Java `FTextField.getText()` (never null; AWT returned ""). */
  getText(): string {
    return this.input.value;
  }

  /** Java `FTextField.setText(String)`. */
  setText(text: string): void {
    this.input.value = text;
  }

  /** Java `FTextField.setSize(int)` - the maximum length, not pixels. */
  setSize(len: number): void {
    this.max = len;
    this.applyMax();
  }

  /** Current maximum length. */
  getMaxLength(): number {
    return this.max;
  }

  /** Java `FTextField.isMatch(String)`. */
  isMatch(test: string | null): boolean {
    if (test === null) return false;
    return test.toUpperCase() === this.getText().toUpperCase();
  }

  /** Java `TextField.setEchoCharacter(char)` - switches to a password field. */
  setEchoCharacter(ch: string): void {
    this.input.type = "password";
    this.echoChar = ch;
  }

  /** The echo character in use, if any. */
  getEchoChar(): string | null {
    return this.echoChar;
  }

  /** Select the whole field (DOM convenience for login forms). */
  selectAll(): void {
    this.input.select();
  }

  /** Java `Component.requestFocus()`. */
  focus(): void {
    this.input.focus();
  }

  /** Blur the field (the stage does this on a region swap). */
  blur(): void {
    this.input.blur();
  }

  override setFont(font: FontName): void {
    super.setFont(font);
    applyFont(this.input, font);
  }

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.input.style.color = col;
  }

  override setBackground(col: ColorSpec): void {
    super.setBackground(col);
    this.input.style.background = col;
  }

  override enable(flag = true): void {
    super.enable(flag);
    this.input.disabled = !flag;
  }
}

/** Factory mirroring `new FTextField(len)` + `reshape` + `setText`. */
export function textField(
  len: number,
  x: number,
  y: number,
  w: number,
  h: number,
  text = "",
): FTextField {
  const field = new FTextField(len);
  field.setText(text);
  field.reshape(x, y, w, h);
  return field;
}
