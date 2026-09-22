/**
 * arCreate - the DOM port of `DCourt.Screens.Command.arCreate` (hero creation).
 *
 * The player spends 20 build points on Guts/Wits/Charm/Money and picks guild
 * traits; `beginPlay()` starts the hero with `arField` once the build balances to
 * zero.  All arithmetic (`getBuild()`, `raise()`, `lower()`) and the whole
 * `createHero()` sequence are ported verbatim.
 *
 * DOM notes:
 *  - Java's `sink` rectangle table is a module constant here (`sinkRects`) so it
 *    cannot be confused with the inherited `Screen.sink()` chrome helper;
 *  - `drawNumSink` keeps the cyan sink with the nested green outlines and the
 *    black/orange double-drawn number, using `center()` for the Java
 *    `(r.width - stringWidth) / 2` centering;
 *  - Java gated the "Enter Here" portrait in `update(Graphics)`; the DOM repaint
 *    runs `paint()` directly (`ui/screen.ts`), so that hook lives in `paint()`;
 *  - integer division is `Math.trunc` (`i / 2` in the trait grid).
 */

import { Constants } from "../../Static/Constants";
import { itAgent } from "../../Items/List/itAgent";
import { itCount } from "../../Items/Token/itCount";
import type { Player } from "../../Control/Player";
import { COLORS, color, fontAscent, rect, type RectLike } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Portrait } from "../../ui/portrait";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import type { GameEvent } from "../../ui/widget";
import { Tools, log } from "../../Tools/Tools";
import { arField } from "../Wilds/arField";
import { arEntry } from "./arEntry";

/** Java `arCreate.sink`: the five value boxes. */
const sinkRects: RectLike[] = [
  rect(40, 80, 65, 40),
  rect(160, 80, 65, 40),
  rect(280, 80, 65, 40),
  rect(245, 160, 100, 40),
  rect(40, 240, 65, 40),
];

/** Java `arCreate.text`: the label above each box. */
const text: string[] = [Constants.GUTS, Constants.WITS, Constants.CHARM, "Money(1p=$25)", "Build Points"];

/** Java `arCreate.traitStr` / `traitCost`. */
const traitStr: string[] = ["Noble", "Wizard", "Warrior", Constants.TRADER];
const traitCost: number[] = [12, 9, 8, 10];

export class arCreate extends Screen {
  /** Java `Button[] add` (renamed: `add()` is `Screen.add(widget)` in TS). */
  private addBtns!: Button[];
  private sub!: Button[];
  private traits!: Checkbox[];
  private guts!: itCount;
  private wits!: itCount;
  private charm!: itCount;
  private money!: itCount;
  private who: Player;

  /** Java `arCreate(Player who)`. */
  constructor(who: Player) {
    super("Hero Creation");
    this.who = who;
    this.setBackground(COLORS.blue);
    this.setForeground(COLORS.white);
    this.hideStatusBar();
    this.prepStats();
  }

  /** Java `prepStats()`. */
  prepStats(): void {
    this.guts = new itCount("g", 4);
    this.wits = new itCount("w", 4);
    this.charm = new itCount("c", 4);
    this.money = new itCount("m", 1);
  }

  /** Java `getBuild()`: remaining build points (traits cost extra). */
  getBuild(): number {
    let build =
      20 -
      (this.guts.getCount() - 4) -
      (this.wits.getCount() - 4) -
      (this.charm.getCount() - 4) -
      (this.money.getCount() - 1);
    for (let ix = 0; ix < 4; ix++) {
      if (this.traits?.[ix]?.getState()) {
        build -= traitCost[ix]!;
      }
    }
    return build;
  }

  isNoble(): boolean {
    return this.traits?.[0]?.getState() ?? false;
  }

  isMagic(): boolean {
    return this.traits?.[1]?.getState() ?? false;
  }

  isFight(): boolean {
    return this.traits?.[2]?.getState() ?? false;
  }

  isThief(): boolean {
    return this.traits?.[3]?.getState() ?? false;
  }

  isGuild(): boolean {
    return this.isMagic() || this.isThief() || this.isFight();
  }

  /**
   * Java `update(Graphics)`: the "Enter Here" portrait only appears once the
   * build is balanced.  The DOM repaint calls `paint()` directly, so the hook
   * moved here (see `ui/screen.ts`).
   */
  override paint(): void {
    this.getPic(1)?.show(this.getBuild() === 0);
    super.paint();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    this.center(
      (this.isNoble() ? "Knight " : "") + String(this.who.getName()),
      200,
      35,
      { font: Tools.bigF, color: COLORS.green },
    );
    for (let i = 0; i < sinkRects.length; i++) {
      const r = sinkRects[i]!;
      this.label(text[i]!, r.x, r.y - 10, { font: Tools.statusF, color: COLORS.yellow });
    }
    this.label("Options", 90, 150, { font: Tools.statusF, color: COLORS.yellow });
    this.drawNumSink(String(this.guts.getCount()), sinkRects[0]!);
    this.drawNumSink(String(this.wits.getCount()), sinkRects[1]!);
    this.drawNumSink(String(this.charm.getCount()), sinkRects[2]!);
    this.drawNumSink(String(this.money.getCount() * 25), sinkRects[3]!);
    this.drawNumSink(String(this.getBuild()), sinkRects[4]!);
  }

  /** Java `drawNumSink(Graphics, String, Rectangle)`. */
  drawNumSink(msg: string, r: RectLike): void {
    const dy = r.y + Math.trunc((r.height + fontAscent(Tools.bigF) - 6) / 2);
    this.drawSink(r);
    const cx = r.x + r.width / 2;
    this.center(msg, cx + 2, dy + 2, { font: Tools.bigF, color: COLORS.black });
    this.center(msg, cx, dy, { font: Tools.bigF, color: color(255, 128, 0) });
  }

  /** Java `drawSink(Graphics, Rectangle)`: the cyan box with green outlines. */
  drawSink(r: RectLike): void {
    this.fill(r.x, r.y, r.width, r.height, color(0, 255, 255));
    this.outline(r.x - 1, r.y - 1, r.width + 1, r.height + 1, color(0, 255, 128));
    this.outline(r.x - 2, r.y - 2, r.width + 3, r.height + 3, color(0, 192, 64));
    this.outline(r.x - 3, r.y - 3, r.width + 5, r.height + 5, color(0, 128, 64));
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway()) {
      return true;
    }
    for (let ix = 0; ix < this.addBtns.length; ix++) {
      if (e.target === this.addBtns[ix]) {
        this.raise(ix);
      }
      if (e.target === this.sub[ix]) {
        this.lower(ix);
      }
    }
    for (let ix2 = 0; ix2 < this.traits.length; ix2++) {
      if (e.target !== this.traits[ix2]) {
        continue;
      }
      const box = this.traits[ix2]!;
      box.setState(box.getState());
      if (box.getState() && this.getBuild() < 0) {
        box.setState(false);
      }
      break;
    }
    if (e.target === this.getPic(0)) {
      Tools.setRegion(new arEntry());
    }
    if (e.target === this.getPic(1)) {
      Tools.setRegion(this.beginPlay());
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.setFont(Tools.textF);
    this.addPic(new Portrait("Exit.jpg", 320, 240, 64, 32));
    this.addPic(new Portrait("fldQuest.jpg", "Enter Here", 180, 215, 96, 64));
    this.getPic(1)?.show(false);
    this.getPic(1)?.setForeground(COLORS.white);

    this.addBtns = new Array<Button>(sinkRects.length - 1);
    this.sub = new Array<Button>(sinkRects.length - 1);
    for (let i = 0; i < sinkRects.length - 1; i++) {
      this.addBtns[i] = new Button("+");
      this.sub[i] = new Button("-");
      const r = sinkRects[i]!;
      this.addBtns[i]!.reshape(r.x - 25, r.y, 20, 20);
      this.sub[i]!.reshape(r.x - 25, r.y + 20, 20, 20);
    }

    let count = traitStr.length;
    if (traitCost.length < count) {
      count = traitCost.length;
    }
    this.traits = new Array<Checkbox>(count);
    for (let i3 = 0; i3 < this.traits.length; i3++) {
      this.traits[i3] = new Checkbox(`${traitStr[i3]} ${traitCost[i3]}p`);
      this.traits[i3]!.setFont(Tools.textF);
      this.traits[i3]!.setForeground(COLORS.white);
      this.traits[i3]!.setBackground(COLORS.blue);
      this.traits[i3]!.reshape(20 + Math.trunc(i3 / 2) * 100, 160 + 25 * (i3 % 2), 100, 20);
    }
  }

  /** Java `addTools()`. */
  override addTools(): void {
    for (let i = 0; i < this.addBtns.length; i++) {
      this.add(this.addBtns[i]!);
      this.add(this.sub[i]!);
    }
    for (let i2 = 0; i2 < this.traits.length; i2++) {
      this.add(this.traits[i2]!);
    }
  }

  /** Java `raise(int what)`. */
  raise(what: number): void {
    switch (what) {
      case 0:
        if (this.getBuild() > 0) {
          this.guts.adds(1);
          return;
        }
        return;
      case 1:
        if (this.getBuild() > 0) {
          this.wits.adds(1);
          return;
        }
        return;
      case 2:
        if (this.getBuild() > 0) {
          this.charm.adds(1);
          return;
        }
        return;
      case 3:
        if (this.getBuild() > 0) {
          this.money.adds(1);
          return;
        }
        return;
      default:
        return;
    }
  }

  /** Java `lower(int what)`. */
  lower(what: number): void {
    switch (what) {
      case 0:
        if (this.guts.getCount() > 4) {
          this.guts.adds(-1);
          return;
        }
        return;
      case 1:
        if (this.wits.getCount() > 4) {
          this.wits.adds(-1);
          return;
        }
        return;
      case 2:
        if (this.charm.getCount() > 4) {
          this.charm.adds(-1);
          return;
        }
        return;
      case 3:
        if (this.money.getCount() > 1) {
          this.money.adds(-1);
          return;
        }
        return;
      default:
        return;
    }
  }

  /** Java `beginPlay()`: null while the build is unbalanced. */
  beginPlay(): Screen | null {
    if (this.getBuild() !== 0) {
      return null;
    }
    this.createHero();
    return this.who.saveHero() ? new arField() : this.who.errorScreen(this);
  }

  /**
   * Java `createHero()`: stamp the chosen stats, ranks, looks and starting place
   * onto the freshly created hero record.
   */
  createHero(): void {
    const hero = this.who.createHero();
    hero.setGuts(this.guts.getCount());
    hero.setWits(this.wits.getCount());
    hero.setCharm(this.charm.getCount());
    hero.getPack().clrQueue();
    hero.getPack().fix("Marks", this.money.getCount() * 25);
    hero.getRank().clrQueue();
    hero.getRank().fix(Constants.LEVEL, 1);
    hero.getRank().fix(Constants.SOCIAL, this.isNoble() ? 1 : 0);
    hero.getStatus().clrQueue();
    hero.getStatus().fix(Constants.AGE, 16);
    hero.calcCombat();
    hero.calcRaise();
    hero.setState(itAgent.CREATE);
    hero.setPlace(Constants.FIELDS);
    if (this.isThief()) {
      hero.addRank(Constants.THIEF, 1);
      hero.fixTemp(Constants.THIEF, hero.thiefRank());
    }
    if (this.isMagic()) {
      hero.addRank(Constants.MAGIC, 1);
      hero.fixTemp(Constants.MAGIC, hero.magicRank());
    }
    if (this.isFight()) {
      hero.addRank(Constants.FIGHT, 1);
      hero.fixTemp(Constants.FIGHT, hero.fightRank());
    }
    if (this.isGuild()) {
      hero.fixStatTrait(Constants.GUILD);
    }
    log("createHero: " + hero.toString());
  }
}
