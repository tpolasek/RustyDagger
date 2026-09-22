/**
 * arPackage - the DOM port of `DCourt.Screens.Utility.arPackage`.
 *
 * The post office / mail room: a `Transfer` screen (pack on the left, a fresh
 * "stash" list on the right) plus a destination name field and a Send button
 * priced at 100 marks per item.  Exiting first merges anything still in the
 * mail package back into the pack.
 *
 * Faithfulness notes:
 *  - the decompiled `goHome()` showed a self-call, but the class file's
 *    `invokespecial` targets `Transfer.goHome`; the port calls `super.goHome()`
 *    for the same reason;
 *  - in the constructor, `Screen.getPack()` and the hero's store are the typed
 *    `itList`s that `Transfer.setValues` expects (the DOM `Screen` seam is
 *    typed loosely, hence the cast);
 *  - `localPaint` used Java's no-argument `Screen.packCount()`, which is
 *    `Screen.getHero().packCount()` in the bytecode;
 *  - `send` reuses Java's `" Package <== "` header and `|`-separated payload,
 *    through the (stubbed) `Loader.cgiBuffer(Loader.SENDMAIL, ...)`.
 */

import type { itHero } from "../../Items/List/itHero";
import { itList } from "../../Items/itList";
import { GameStrings } from "../../Static/GameStrings";
import { Buffer } from "../../Tools/Buffer";
import { Loader } from "../../Tools/Loader";
import { MadLib } from "../../Tools/MadLib";
import { Tools } from "../../Tools/Tools";
import { Button } from "../../ui/button";
import { COLORS, color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { FTextField } from "../../ui/textField";
import type { GameEvent } from "../../ui/widget";
import { Transfer } from "../Template/Transfer";
import { arNotice } from "./arNotice";

export class arPackage extends Transfer {
  private send!: Button;

  private name!: FTextField;

  /** Java `arPackage.breaksound`. */
  readonly breaksound: string[] = [
    "***KEERASH***",
    "***SMASHOLA***",
    "***BANG+CRACK+POP***",
    "+++SHLORP-bump+++",
    "***CRASH***...tinkle...",
    "HEE-HAW! HEE HAW!",
    "***KABADABOOM***",
    "...bzzzzzzzzzzzz...",
    "AIYEEEE!!!!",
  ];

  /** Java `arPackage.mailSent`. */
  static readonly mailSent =
    "$TB$Okay Chief, got it covered.  When your friend comes to pick it up, we'll have it sitting right on top here.$CR$$CR$$TB$$TB$$crash$$CR$$CR$$TB$No problem, got it covered.$CR$";

  /** Java `arPackage(Screen from)`. */
  constructor(from: Screen) {
    super(from, String(from.getTitle()).concat(" Mail Room"));
    this.setBackground(color(0, 0, 128));
    this.setForeground(COLORS.white);
    this.hideStatusBar();
    this.setValues(0, Screen.getPack() as unknown as itList, new itList("stash"));
  }

  /** Java `goHome()`: put the unsent package back, then exit (bytecode: super.goHome()). */
  override goHome(): void {
    Screen.getPack().merge(this.getStash());
    this.clrStash();
    super.goHome();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    super.localPaint();
    this.updateTools();
    const col = this.getForeground();
    this.label("Send To:", 10, 285, { font: Tools.textF, color: col });
    this.label(`Backpack ${Screen.getHero().packCount()}`, 30, 65, {
      font: Tools.statusF,
      color: col,
    });
    this.label(`Mail Package ${this.stashCount()}`, 230, 65, {
      font: Tools.statusF,
      color: col,
    });
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.send) {
      Tools.setRegion(this.sendPackage());
    }
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    super.createTools();
    this.send = new Button("Send $0");
    this.send.reshape(275, 272, 80, 20);
    this.send.setFont(Tools.textF);
    this.name = new FTextField(15);
    this.name.reshape(65, 270, 200, 22);
    this.updateTools();
  }

  /** Java `addTools()`. */
  override addTools(): void {
    super.addTools();
    this.add(this.send);
    this.add(this.name);
  }

  /** Java `updateTools()`. */
  override updateTools(): void {
    const count = this.stashCount();
    this.send.setLabel(`Send $${count * 100}`);
    this.send.enable(count > 0 && Screen.getMoney() >= count * 100);
    super.updateTools();
  }

  /** Java `sendPackage()`. */
  sendPackage(): Screen {
    const h = Screen.getHero() as unknown as itHero;
    const dest = this.name.getText();
    if (dest.length < 4 || dest.length > 15) {
      return new arNotice(
        this,
        `\tThe name you have selected is malformed:\n<${dest}>\n\n` +
          "\tHero names must be at least 4 letters and no " +
          "more than 15 letters\n",
      );
    }
    if (Screen.getHero().isMatch(dest)) {
      return new arNotice(
        this,
        "\tWhat is the point of sending mail to yourself?\n\n\tIt poses a metaphysical conundrum, and lends the suggestion that you are insane.\n\n<<Why'd I go and say a fool thing like that?>>\n",
      );
    }
    const count = this.stashCount();
    h.subMoney(count * 100);
    if (!Screen.saveHero()) {
      h.addMoney(count * 100);
      return new arNotice(this.getHome(), GameStrings.SAVE_CANCEL);
    }
    const result = arPackage.send(
      String(h.getTitle()).concat(String(h.getName())),
      dest,
      this.getStash() as itList,
    );
    if (result !== null) {
      Screen.addMoney(count * 100);
      return new arNotice(this, GameStrings.MAIL_CANCEL.concat(result));
    }
    const sent = new MadLib(arPackage.mailSent);
    sent.replace("$crash$", Tools.select(this.breaksound));
    return new arNotice(this.getHome(), sent.getText());
  }

  /** Java `public static String send(String source, String dest, itList mail)`. */
  static send(source: string, dest: string, mail: itList): string | null {
    const pkg = new Buffer(mail.toString());
    let msg = Tools.getToday();
    msg = msg.substring(0, msg.lastIndexOf("/"));
    msg = msg.concat(" Package <== ".concat(source));
    msg = msg.concat("|".concat(dest).concat("\n"));
    msg = msg.concat(pkg.toString());
    const payload = String(Screen.getHero().getName())
      .concat("|")
      .concat(String(Screen.getPlayer().getSessionID()))
      .concat("|")
      .concat(msg);
    const buf = Loader.cgiBuffer(Loader.SENDMAIL, payload);
    if (buf.isError()) {
      return buf.peek();
    }
    return null;
  }
}
