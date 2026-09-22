/**
 * Button - the DOM rewrite of `java.awt.Button` as used by the screens.
 *
 * Java: `new Button("Done")`, `reshape(x, y, w, h)`, `setLabel`, `enable`,
 * and dispatch through `Screen.action` with `e.target === this.done`.
 * DOM: a native `<button class="game-button">` so focus, Enter/Space and
 * accessibility come for free; the click handler reports through `fire()`.
 */

import { type ColorSpec } from "./dom";
import { Widget } from "./widget";

export class Button extends Widget {
  private labelText: string;

  constructor(label = "") {
    super(document.createElement("button"));
    this.el.className = "game-button";
    this.el.setAttribute("type", "button");
    this.labelText = label;
    this.el.textContent = label;
    this.listen(this.el, "click", () => {
      if (this.isEnabled()) this.fire();
    });
  }

  /** Java `Button.getLabel()`. */
  getLabel(): string {
    return this.labelText;
  }

  /** Java `Button.setLabel(String)`. */
  setLabel(label: string): void {
    this.labelText = label;
    this.el.textContent = label;
  }

  /** Java `Component.enable(boolean)`, keeping the native disabled state. */
  override enable(flag = true): void {
    super.enable(flag);
    (this.el as HTMLButtonElement).disabled = !flag;
  }

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.el.style.color = col;
  }

  override setBackground(col: ColorSpec): void {
    super.setBackground(col);
    this.el.style.background = col;
  }

  /** Move focus to this button (DOM convenience). */
  focus(): void {
    this.el.focus();
  }
}

/** Factory mirroring `new Button(label)` + `reshape`. */
export function button(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onAction?: (b: Button) => void,
): Button {
  const b = new Button(label);
  b.reshape(x, y, w, h);
  if (onAction) b.onAction = (w2) => onAction(w2 as Button);
  return b;
}
