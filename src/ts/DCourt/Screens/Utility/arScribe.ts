/**
 * arScribe - the DOM port of `DCourt.Screens.Utility.arScribe`.
 *
 * The note-writing screen behind the "Pen & Paper" use effect: a red panel with
 * an `FTextArea`, a Cancel and a Done button.  `Done` detokenizes the text
 * (`{`->`(`, `|`->`:`, `}`->`)`), spends one "Pen & Paper" from the pack and
 * files either a `Letter` or a `Postcard` (depending on the item that opened
 * the screen) in the pack.
 *
 * Java's no-argument constructor and `(Screen, String)` constructor are folded
 * into one here (`use` is the item that paid for the note).
 */

import { itNote } from "../../Items/List/itNote";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { COLORS } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { FTextArea } from "../../ui/textArea";
import type { GameEvent } from "../../ui/widget";

export class arScribe extends Screen {
  private cancel!: Button;

  private done!: Button;

  private text!: FTextArea;

  private spend: string;

  /** Java `arScribe()` / `arScribe(Screen from, String use)`. */
  constructor(from?: Screen | null, use = "") {
    super(from ?? null, "Compose A Note");
    this.setBackground(COLORS.red);
    this.setForeground(COLORS.black);
    this.setFont(Tools.statusF);
    this.spend = use;
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.cancel) {
      Tools.setRegion(this.getHome());
    }
    if (e.target === this.done) {
      this.addNoteToPack();
      Tools.setRegion(this.getHome());
    }
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.setFont(Tools.textF);
    this.setForeground(COLORS.black);
    this.cancel = new Button("Cancel");
    this.done = new Button("Done");
    this.text = new FTextArea(Tools.DEFAULT_HEIGHT);
    this.text.reshape(20, 30, 360, 230);
    this.text.setFont(Tools.statusF);
    this.cancel.reshape(280, 5, 50, 20);
    this.cancel.setFont(Tools.textF);
    this.done.reshape(340, 5, 50, 20);
    this.done.setFont(Tools.textF);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    this.add(this.cancel);
    this.add(this.done);
    this.add(this.text);
  }

  /** Java `addNoteToPack()`. */
  addNoteToPack(): void {
    const msg = Tools.detokenize(this.text.getText());
    Screen.subPack(this.spend, 1);
    Screen.putPack(
      new itNote(
        this.spend === "Pen & Paper" ? "Letter" : "Postcard",
        String(Screen.getHero().getName()),
        msg,
      ),
    );
  }
}
