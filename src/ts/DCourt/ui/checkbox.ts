/**
 * Checkbox / CheckboxGroup - the DOM rewrite of `java.awt.Checkbox` and
 * `java.awt.CheckboxGroup` (used by arCreate, arBuild and arClanHall).
 *
 * Java:
 *   new Checkbox("Noble 12p")                      -> an independent box
 *   new Checkbox("Members", this.clanAction, true) -> a radio in a group
 *   this.traits[i].getState() / setState(bool)
 *   this.clanAction.getCurrent() / setCurrent(cb)
 *
 * DOM: a `<label>` wrapping an `<input type="checkbox">` (or `type="radio"`)
 * plus the caption, so the whole Java rectangle stays clickable and the native
 * activation behaviour (mouse, keyboard, label forwarding) is reused.  Only the
 * browser's own `change` event reports through `fire()`, which keeps the action
 * dispatch to exactly one call per user click - programmatic `setState()` stays
 * silent, like Java's `setState`.
 */

import { type ColorSpec, type FontName, applyFont, el, fontCss } from "./dom";
import { Widget } from "./widget";

let groupSeq = 0;

/** Java `CheckboxGroup`: makes its members mutually exclusive. */
export class CheckboxGroup {
  /** Radio `name` shared by the members of this group. */
  readonly name: string;
  private readonly boxes: Checkbox[] = [];
  private current: Checkbox | null = null;

  constructor() {
    groupSeq += 1;
    this.name = `dct-radio-${groupSeq}`;
  }

  /** Internal: register a member box. */
  adopt(box: Checkbox): void {
    this.boxes.push(box);
    if (box.getState()) this.current = box;
  }

  /** Java `CheckboxGroup.getCurrent()`. */
  getCurrent(): Checkbox | null {
    return this.current;
  }

  /** Java `CheckboxGroup.setCurrent(Checkbox)`. */
  setCurrent(box: Checkbox | null): void {
    if (box === null) {
      for (const member of this.boxes) member.setState(false);
      this.current = null;
      return;
    }
    for (const member of this.boxes) member.setState(member === box);
    this.current = box;
  }

  /** Internal: a member changed state through the DOM. */
  notify(box: Checkbox, checked: boolean): void {
    if (checked) this.current = box;
    else if (this.current === box) this.current = null;
  }

  /** Members of this group, in creation order. */
  getBoxes(): readonly Checkbox[] {
    return this.boxes;
  }
}

export class Checkbox extends Widget {
  private group: CheckboxGroup | null;
  private readonly input: HTMLInputElement;
  private readonly caption: HTMLSpanElement;
  private state: boolean;
  private labelText: string;

  /**
   * Java overloads:
   *   new Checkbox()
   *   new Checkbox(label)
   *   new Checkbox(label, group, initialState)
   */
  constructor(label = "", group: CheckboxGroup | null = null, initialState = false) {
    super(document.createElement("label"));
    this.el.style.display = "flex";
    this.el.style.alignItems = "center";
    this.el.style.gap = "2px";
    this.el.style.overflow = "hidden";
    this.el.style.whiteSpace = "pre";
    this.el.style.cursor = "pointer";

    this.labelText = label;
    this.group = group;
    this.state = initialState;

    this.input = document.createElement("input");
    this.input.type = group ? "radio" : "checkbox";
    if (group) {
      this.input.name = group.name;
      group.adopt(this);
    }
    this.input.checked = initialState;
    this.input.style.margin = "0";
    this.input.style.flex = "0 0 auto";

    this.caption = el("span", null, { whiteSpace: "pre" });
    this.caption.textContent = label;

    this.el.appendChild(this.input);
    this.el.appendChild(this.caption);

    this.listen(this.input, "change", () => {
      this.state = this.input.checked;
      this.group?.notify(this, this.state);
      this.fire();
    });
  }

  /** Java `Checkbox.getState()`. */
  getState(): boolean {
    return this.state;
  }

  /** Java `Checkbox.setState(boolean)` - does not fire an action. */
  setState(flag: boolean): void {
    this.state = flag;
    this.input.checked = flag;
    if (this.group && flag) this.group.notify(this, true);
  }

  /** Java `Checkbox.getLabel()`. */
  getLabel(): string {
    return this.labelText;
  }

  /** Java `Checkbox.setLabel(String)`. */
  setLabel(label: string): void {
    this.labelText = label;
    this.caption.textContent = label;
  }

  /** The group this box belongs to (null for standalone checkboxes). */
  getGroup(): CheckboxGroup | null {
    return this.group;
  }

  /** Move the box into a group (or out of one). */
  setGroup(group: CheckboxGroup | null): void {
    this.group = group;
    this.input.type = group ? "radio" : "checkbox";
    if (group) {
      this.input.name = group.name;
      group.adopt(this);
      this.input.checked = this.state;
    } else {
      this.input.removeAttribute("name");
    }
  }

  override setFont(font: FontName): void {
    super.setFont(font);
    applyFont(this.caption, font);
    this.caption.style.font = fontCss(font);
    // The flex wrapper itself stays font-neutral.
    this.el.style.font = "";
  }

  override setForeground(col: ColorSpec): void {
    super.setForeground(col);
    this.caption.style.color = col;
  }

  override setBackground(col: ColorSpec): void {
    super.setBackground(col);
    this.caption.style.background = col;
  }

  override enable(flag = true): void {
    super.enable(flag);
    this.input.disabled = !flag;
  }
}

/** Factory mirroring `new Checkbox(label, group, state)` + `reshape`. */
export function checkbox(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  group: CheckboxGroup | null = null,
  state = false,
): Checkbox {
  const box = new Checkbox(label, group, state);
  box.reshape(x, y, w, h);
  return box;
}
