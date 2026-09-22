/**
 * Options - the combat option menu (Java `DCourt.Screens.Quest.Options`).
 *
 * Java drew the list on a Canvas and picked the entry under the mouse from the
 * y coordinate (`handleEvent` ids 501/503), then posted `Event(1001)` so
 * `arQuest.action` could react to `e.target == this.opt`.  The DOM version
 * renders one row per option, keeps the same red selection marker, and reports
 * clicks through `fire()`.
 *
 * The option state machine is a line-for-line port of `fixList()` / `append()`
 * / `redraw()` / `nextRound()` - including the fact that option 13 ("fish")
 * shows the "feed" strings, which is how the Java source reads.
 *
 * Note: Java had a field `select` *and* a method `select()`; the field is named
 * `selectVal` here.
 *
 * This is the only `ui/` module that imports `DCourt.Tools.Tools` (for the
 * game RNG).  That is safe: Tools imports the other ui modules but never this
 * one, so the dependency graph stays acyclic.
 */

import { COLORS, div } from "./dom";
import { Widget } from "./widget";
import { roll } from "../Tools/Tools";
import { getHero } from "./session";
import type { Loose } from "./session";

/** Java `Options.OPT_ARRAY` - index -> option name. */
const OPT_ARRAY = [
  "bribe",
  "feed",
  "riddle",
  "trade",
  "help",
  "seduce",
  "control",
  "backstab",
  "berzerk",
  "swindle",
  "ieatsu",
  "attack",
  "flee",
  "fish",
  "bushido",
  "capture",
] as const;

/** Java `Options.OPT_STRING` - index -> random wordings. */
const OPT_STRING: readonly (readonly string[])[] = [
  ["Bribe with Marks", "Pay for Passage", "Give it Money"],
  ["Feed This Creature", "Tempt With Food", "Throw Some Grub"],
  ["Try to Answer", "Hazard a Guess", "Riddle Me This"],
  ["Bargain", "Barter", "Swap Goods", "Trade"],
  ["Aid the Poor Booger", "Help Out", "Lend a Hand"],
  ["Seduce the Beast", "Use Sex Appeal", "Flirt Lewdly"],
  ["  M:Hypnotize"],
  ["  T:Backstab"],
  ["  F:Berzerk"],
  ["  T:Swindle"],
  ["  S:Ieatsu"],
  [
    "Slay This Brute",
    "Attack Yon Beastie",
    "Assault The Monster",
    "Kill The Critter",
    "Smash The Devil",
  ],
  ["Flee For Safety", "Run For Your Life", "Evade With Haste", "Run Away! Run Away!"],
  ["Feed This Creature", "Tempt With Food", "Throw Some Grub"],
  ["Present Your Token", "Display A Token", "Hand Over Token"],
  ["Grab The Sucker", "Bottle This Thing", "Take it Captive"],
];

/* Option numbers, matching the `static final int`s in the Java source. */
const BRIBE = 0;
const FEED = 1;
const TRADE = 3;
const CONTROL = 6;
const BACKSTAB = 7;
const BERZERK = 8;
const SWINDLE = 9;
const IEATSU = 10;
const ATTACK = 11;
const RUNAWAY = 12;
const CARP = 13;
const BUSHIDO = 14;

/* Mirrors DCourt.Static.GearTypes (Phase 1 owns the real constants). */
const FOOD = "Food";
const FISH = "Fish";
const TOKEN = "Bushido Token";

/** One entry of the internal option list (Java: `itValue(tag, text)`). */
interface OptionEntry {
  tag: number;
  text: string;
}

export class Options extends Widget {
  private readonly entries: OptionEntry[] = [];
  private goal: Loose | null;
  private selectVal = -1;
  private firstRound = true;
  private fontSize = 16;
  private rowH = 12;
  private offsetY = 0;

  /** Java `Options(itList ml)`; omit `ml` for the goal-less constructor. */
  constructor(ml: Loose | null = null) {
    super(div("options"));
    this.goal = ml;
    this.el.style.overflow = "hidden";
    this.el.style.background = COLORS.fill;
    this.el.style.padding = "0";
    if (ml) {
      this.fixList();
      this.redraw();
    }
    this.setBounds(0, 0, 200, 110);
  }

  /** Java `Options.reshape(x, y, w, h)`. */
  override setBounds(x: number, y: number, w: number, h: number): void {
    super.setBounds(x, y, w, h);
    this.setdraw();
  }

  /**
   * Java `Options.select()` - the option number currently highlighted.
   * Returns -1 instead of throwing when nothing is highlighted (Java indexed
   * the list unchecked).
   */
  select(): number {
    return this.get(this.selectVal);
  }

  /** Java `Options.count()`. */
  count(): number {
    return this.entries.length;
  }

  /** Java `Options.text(int)`. */
  text(which: number): string {
    return this.entries[which]?.text ?? "";
  }

  /** Java `Options.get(int)` - the option number stored in an entry. */
  get(which: number): number {
    if (which < 0 || which >= this.entries.length) return -1;
    return this.entries[which]?.tag ?? -1;
  }

  /** Current highlighted index (Java's private `select` field). */
  getSelect(): number {
    return this.selectVal;
  }

  /** Highlight an entry without dispatching (Java's mouse-move behaviour). */
  setSelect(which: number): void {
    const next = which >= 0 && which < this.entries.length ? which : -1;
    if (next === this.selectVal) return;
    this.selectVal = next;
    this.render();
  }

  /** Java `Options.append(int what)` - add a randomly worded option. */
  append(what: number): void {
    const wordings = OPT_STRING[what];
    if (!wordings || wordings.length === 0) return;
    const which = roll(wordings.length);
    const drop = this.entries.findIndex((entry) => entry.tag === what);
    if (drop >= 0) this.entries.splice(drop, 1);
    this.entries.push({ tag: what, text: wordings[which] ?? "" });
  }

  /** Java `Options.remove(int what)` - take an option away from the monster. */
  remove(what: number): void {
    const name = OPT_ARRAY[what];
    if (this.goal && name !== undefined) this.goal.drop(name);
  }

  /** Java `Options.redraw()` - append the hero's rating to magic/thief/combat. */
  redraw(): void {
    const h = getHero();
    if (!h) return;
    for (const entry of this.entries) {
      const ix = entry.tag;
      const head = OPT_STRING[ix]?.[0] ?? "";
      if (ix === CONTROL) entry.text = `${head}[${h.magic()}]`;
      else if (ix === BACKSTAB || ix === SWINDLE) entry.text = `${head}[${h.thief()}]`;
      else if (ix === BERZERK) entry.text = `${head}[${h.fight()}]`;
      else if (ix === IEATSU) entry.text = `${head}[${h.ieatsu()}]`;
    }
    this.setdraw();
  }

  /** Java `Options.fixList()` - build the round's option list. */
  fixList(): void {
    const h = getHero();
    if (!h) return;
    this.entries.length = 0;
    this.selectVal = -1;

    if (h.hasTrait("Panic")) {
      this.append(RUNAWAY);
    } else if (!this.firstRound) {
      this.append(ATTACK);
      this.append(RUNAWAY);
      if (this.goalContains("control") && Number(h.magic()) > 0) this.append(CONTROL);
      if (Number(h.fight()) > 0) this.append(BERZERK);
    } else {
      this.append(ATTACK);
      this.append(RUNAWAY);
      const count = this.goal ? Number(this.goal.getCount()) : 0;
      for (let ix = 0; ix < count; ix++) {
        const name = String(this.goal?.select(ix)?.getName() ?? "");
        // Java used `OPT_LIST.firstOf(name)`, i.e. a case-insensitive name match.
        const choice = OPT_ARRAY.findIndex((entry) => entry.toUpperCase() === name.toUpperCase());
        if (choice < 0 || !this.allowed(h, choice)) continue;
        if (choice === BACKSTAB || choice === SWINDLE) {
          if (Number(h.thief()) > 0) this.append(choice);
        } else if (choice !== CONTROL) {
          this.append(choice);
        } else if (Number(h.magic()) > 0) {
          this.append(CONTROL);
        }
      }
      if (Number(h.ieatsu()) > 0) this.append(IEATSU);
    }
    this.setdraw();
  }

  /** The nested affordability test from `Options.fixList()`. */
  private allowed(h: Loose, choice: number): boolean {
    if (choice === BRIBE && Number(h.getMoney()) < 1) return false;
    if (choice === TRADE && Number(h.getMoney()) < 1) return false;
    if (choice === FEED && Number(h.packCount(FOOD)) < 1) return false;
    if (choice === CARP && Number(h.packCount(FISH)) < 1) return false;
    if (choice === BUSHIDO) {
      return (
        Number(h.packCount(TOKEN)) >= 1 &&
        Number(h.getQuests()) >= 10 &&
        Number(h.guildRank()) < Number(h.getLevel())
      );
    }
    return true;
  }

  private goalContains(name: string): boolean {
    return this.goal ? Boolean(this.goal.contains(name)) : false;
  }

  /** Java `Options.nextRound(itHero h, itMonster m)`. */
  nextRound(h: Loose, m: Loose): void {
    this.firstRound = false;
    if (m.isHostile() || m.isDefensive()) m.incStance();
  }

  /** True while the encounter is still in its opening round. */
  isFirstRound(): boolean {
    return this.firstRound;
  }

  /** Reset to the opening round (used when a screen restarts a battle). */
  resetRounds(): void {
    this.firstRound = true;
  }

  /* ---------------------------------------------------------- rendering */

  /**
   * Java `Options.setdraw()`: shrink the font until every option fits (16 down
   * to 8, keeping 8 when nothing fits), then centre the block vertically.
   */
  private setdraw(): void {
    const count = Math.max(1, this.entries.length);
    const height = this.height;
    let size = 16;
    let rowH = Math.round(size * 0.75) + Math.round(size * 0.25);
    for (; size >= 8; size--) {
      rowH = Math.round(size * 0.75) + Math.round(size * 0.25);
      if (rowH * count < height) break;
    }
    if (size < 8) size = 8;
    this.fontSize = size;
    this.rowH = rowH;
    this.offsetY = Math.trunc((height - this.entries.length * this.rowH) / 2);
    if (this.offsetY < 0) this.offsetY = 0;
    this.render();
  }

  /** Java `Options.paint(Graphics)`. */
  override repaint(): void {
    this.render();
  }

  private render(): void {
    const rows: HTMLDivElement[] = [];
    for (let ix = 0; ix < this.entries.length; ix++) {
      const entry = this.entries[ix];
      if (!entry) continue;
      const row = div(null, entry.text);
      row.style.position = "absolute";
      row.style.left = "2px";
      row.style.top = `${this.offsetY + ix * this.rowH}px`;
      row.style.height = `${this.rowH}px`;
      row.style.lineHeight = `${this.rowH}px`;
      row.style.whiteSpace = "pre";
      row.style.font = `italic bold ${this.fontSize}px "Times New Roman", serif`;
      // Java drew the highlighted option in red, the rest in black.
      row.style.color = this.selectVal === ix ? COLORS.red : COLORS.black;
      row.style.cursor = "pointer";
      row.dataset.index = String(ix);

      // Listeners are attached directly: the rows are recreated on every
      // render, so they must not accumulate on the widget's AbortController.
      const index = ix;
      row.addEventListener("mouseenter", () => this.setSelect(index));
      row.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        this.setSelect(index);
        if (this.selectVal < 0 || this.selectVal >= this.entries.length) return;
        this.fire();
      });
      rows.push(row);
    }
    this.el.replaceChildren(...rows);
  }
}

/** Factory mirroring `new Options(ml)` + `reshape`. */
export function options(
  goal: Loose | null,
  x: number,
  y: number,
  w: number,
  h: number,
): Options {
  const menu = new Options(goal);
  menu.reshape(x, y, w, h);
  return menu;
}
