/**
 * arPostal - the DOM port of `DCourt.Screens.Areas.Castle.arPostal`
 * (Java: `Sloeth Dreyfus Postal Express`).
 *
 * An `Indoors` screen holding a mail list (`FTextList`) plus Take/Send
 * buttons.  `loadMailList()`/`takePackage()` run through `FileLoader`, whose
 * mail calls are empty/error-free in local mode, so the local flow (empty list,
 * error notice, pack merge) is preserved while server mode gets real mail.
 *
 * Port note: the `Indoors` portraits are registered by the `Indoors`
 * constructor, so `createTools()` only builds the mail widgets.
 */

import { Tools } from "../../../Tools/Tools";
import { FileLoader } from "../../../Tools/FileLoader";
import { Screen } from "../../../ui/screen";
import { Button } from "../../../ui/button";
import { FTextList } from "../../../ui/textList";
import { color } from "../../../ui/dom";
import type { GameEvent } from "../../../ui/widget";
import type { HeroLike } from "../../../ui/session";
import { Indoors } from "../../Template/Indoors";
import { arNotice } from "../../Utility/arNotice";
import { arPackage } from "../../Utility/arPackage";
import { Item } from "../../../Items/Item";
import { itList } from "../../../Items/itList";

/** Java `arPostal.greeting`. */
const greeting: string[] = [
  "",
  "In a minute..",
  "Okay, alright already.",
  "Fill in this form.",
  "This form is wrong",
  "I'm on my break",
  "Geez, again?",
  "*Sigh* Oh I suppose.",
  "Right now? Yeah, yeah.",
];

export class arPostal extends Indoors {
  private take!: Button;
  private send!: Button;
  private postbox!: FTextList;
  /** Java `itList mail`; the server hands back one row per package. */
  private mailRows: Array<{ id: number; label: string }> | null = null;

  constructor(from: Screen | null) {
    super(from, "Sloeth Dreyfus Postal Express");
    this.setBackground(color(128, 255, 128));
    this.setForeground(color(0, 128, 0));
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Sloeth.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? Tools.getBest() + "? Oh yeah." : msg;
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    super.localPaint();
    this.updateTools(Tools.getHero());
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) return true;
    if (e.target === this.take) void this.takePackage();
    if (e.target === this.send) Tools.setRegion(new arPackage(this));
    if (e.target === this.getPic(0)) Tools.setRegion(this.getHome());
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    const h = Screen.getHero();
    this.take = new Button("Take Mail $100");
    this.take.reshape(160, 40, 150, 20);
    this.take.setFont(Tools.textF);
    this.send = new Button("Send Mail <x$100>");
    this.send.reshape(10, 240, 140, 20);
    this.send.setFont(Tools.textF);
    this.postbox = new FTextList();
    this.postbox.reshape(160, 70, 230, 180);
    this.postbox.setFont(Tools.textF);

    if (this.mailRows === null) void this.loadMailList();
    else this.fillPostbox();

    this.postbox.setSelect(-1);
    this.updateTools(h);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.take);
    this.add(this.send);
    this.add(this.postbox);
  }

  /** Java `updateTools(itAgent)`. */
  updateTools(h: HeroLike): void {
    this.take.enable(this.postbox.getSelect() >= 0 && h.getMoney() >= 100);
  }

  /** Java `loadMailList()`; the server hands the list back asynchronously. */
  async loadMailList(): Promise<void> {
    this.mailRows = await FileLoader.listMail(Screen.getHero().getName());
    this.fillPostbox();
    this.postbox.setSelect(-1);
    this.updateTools(Screen.getHero());
    if (!Tools.movedAway(this)) this.repaint();
  }

  /** Java's `createTools` loop over `mail.elements()`, over the server's labels. */
  private fillPostbox(): void {
    for (const row of this.mailRows ?? []) this.postbox.addItem(row.label);
  }

  /** Java `takePackage()`; the package body is fetched asynchronously. */
  async takePackage(): Promise<void> {
    const h = Screen.getHero();
    const index = this.postbox.getSelect();
    if (index < 0) return;
    const row = this.mailRows?.[index] ?? null;
    const msg = this.postbox.getItem(index);
    this.postbox.delItem(index);
    this.mailRows?.splice(index, 1);
    if (row === null) return;

    const buf = await FileLoader.takeMail(h.getName(), row.id);
    if (Tools.movedAway(this)) return;
    if (buf === null || buf.isEmpty() || buf.isError()) {
      Tools.setRegion(
        new arNotice(
          this,
          "A transmission error has occurred:\n" +
            (buf === null ? "" : buf.peek()) +
            "\n" +
            "Sorry About That.",
        ),
      );
      return;
    }

    let msg2 =
      "\tA mail daemon pushes out a dilapidated package, makes a futile attempt to polish it up, then scurries into the depths of the mail room.\n\nThe label reads:\n\t" +
      msg +
      "\n" +
      "The package contains:\n";

    const list = Item.factory(buf) as itList | null;
    if (list !== null) {
      for (let ix = 0; ix < list.getCount(); ix++) {
        const it = list.select(ix);
        if (it !== null && it.getName() !== null && it.getName().length >= 1) {
          msg2 += "\t" + it.toShow() + "\n";
          Screen.addPack(it);
        }
      }
    }

    h.subMoney(100);
    Screen.saveHero();
    Tools.setRegion(new arNotice(this, msg2));
  }
}
