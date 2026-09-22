/**
 * arRanking - the DOM port of `DCourt.Screens.Command.arRanking`.
 *
 * Five ranking boards (Fame / Skill / Rank / Guild / Clan), each one an `itList`
 * of hero records read from the ranking file that `Tools.getRankings()` fetches.
 * `init()` digests the buffer through `Item.factory`; the CGI layer is stubbed in
 * the browser build (`Loader.cgi` returns ""), so the boards come back empty and
 * the screen paints "No Records Found" - the documented parity behaviour.
 *
 * DOM notes:
 *  - the rows are painted into the screen's paint layer (they are not widgets),
 *    so the `FScrollbar` on the right reports its moves through `action()`, which
 *    repaints - the same path Java took through `Event(1001)`;
 *  - `Screen.init()` repaints at the end in the DOM port, but `super.init()` in
 *    Java did not; `localPaint()` therefore bails out until `digest()` has run and
 *    repaints itself once the boards exist;
 *  - `heroItem` is dropped: Java declared it and never used it.
 */

import { Constants } from "../../Static/Constants";
import { Item } from "../../Items/Item";
import { itList } from "../../Items/itList";
import { COLORS, color, textWidth, type ColorSpec } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Button } from "../../ui/button";
import { FScrollbar } from "../../ui/textList";
import type { GameEvent } from "../../ui/widget";
import type { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";

/** Java `arRanking` constants. */
const SHOWROWS = 12;
const SHOWLEFT = 220;
const SHOWWIDE = 55;
const CLAN_DISPLAY = 4;

/** Java `arRanking.rankStr`: the five board names. */
const rankStr: string[] = [
  Constants.FAME,
  Constants.SKILL,
  Constants.RANK,
  Constants.GUILD,
  Constants.CLAN,
];

/** Java `arRanking.office`. */
const office: string[] = [
  "Queens Champion",
  "Captain of the Guard",
  "Chief Counselor",
  "Guild Master",
  "Clan Rankings",
];

/** Java `arRanking.stats`: the three column headers of each board. */
const stats: string[][] = [
  [Constants.FAME, "Place", Constants.CLAN],
  [Constants.SKILL, "At/Df", "Stats"],
  [Constants.RANK, Constants.AGE, ""],
  ["Cash", Constants.GUILD, ""],
  ["Men", "Power", "Leader"],
];

/** Java `arRanking.clear` (declared but unused there as well). */
const clear: ColorSpec[] = [
  color(255, 128, 128),
  color(0, 224, 224),
  color(255, 0, 255),
  color(0, 255, 0),
  color(255, 128, 128),
];

/** Java `arRanking.bars`: the two vertical column bands. */
const bars: ColorSpec[] = [
  color(255, 160, 160),
  color(128, 255, 255),
  color(255, 128, 255),
  color(160, 255, 160),
  color(255, 160, 160),
];

export class arRanking extends Screen {
  private done!: Button;
  private ranks!: Button[];
  /** Java `itList[] lists`, filled by `digest()`. */
  private lists: itList[] | null = null;
  private start = 0;
  private top = 0;
  private which = 0;
  private scroll!: FScrollbar;

  constructor(from: Screen | null) {
    super(from, "arRankig"); // Java's title, typo included
    this.setBackground(COLORS.green);
    this.setForeground(COLORS.black);
    this.setFont(Tools.statusF);
    this.hideStatusBar();
  }

  /** Java `init()`: read the ranking file, then digest it. */
  override init(): void {
    super.init();
    const buf = Tools.getRankings();
    if (buf === null || buf.isError()) {
      // Java called `buf.line()` unconditionally (an NPE without a rank file).
      const reason = buf === null ? "" : String(buf.line());
      Tools.setRegion(new arNotice(this.getHome(), "Error Reading Rankfile:\n".concat(reason)));
      return;
    }
    this.digest(buf as Buffer);
    // `super.init()` already painted once, before the boards existed.
    this.repaint();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const lists = this.lists;
    if (lists === null) {
      return;
    }
    const hero = Tools.heroOrNull();
    let target: string;
    if (this.which === CLAN_DISPLAY) {
      target = hero === null ? "none" : String(hero.getClan());
    } else {
      target = hero === null ? "not" : String(hero.getName());
    }
    const list = lists[this.which]!;
    this.scroll.setMax(list.getCount() - SHOWROWS);
    this.scroll.setJump(SHOWROWS);
    this.scroll.setStep(1);
    this.fill(217, 0, SHOWWIDE, 265, bars[this.which]!);
    this.fill(327, 0, SHOWWIDE, 265, bars[this.which]!);
    this.label(office[this.which]!, 30, 20, { font: Tools.courtF, color: color(0, 0, 128) });
    for (let i = 0; i < 3; i++) {
      this.label(stats[this.which]![i]!, SHOWLEFT + i * SHOWWIDE, 20);
    }
    const base = this.scroll.getVal();
    if (list.getCount() < 1) {
      this.label("No Records Found", 28, 44);
      return;
    }
    const items = list.elements();
    for (let i3 = 1; i3 <= SHOWROWS; i3++) {
      const it = items[base + i3 - 1];
      if (it === undefined) {
        break;
      }
      // Java skipped non-list records but still consumed a row.
      if (!(it instanceof itList)) {
        continue;
      }
      const row = it;
      const v = 24 + i3 * 20;
      this.fill(0, v, Tools.DEFAULT_WIDTH, 1, COLORS.white);
      const fg = row.isMatch(target) ? COLORS.blue : COLORS.black;
      const rank = row.select(0)?.getName() ?? "";
      const h = textWidth(rank, Tools.textF);
      this.label(rank, 3, v, { font: Tools.textF, color: fg });
      let next = 0;
      if (this.which === CLAN_DISPLAY) {
        this.label(row.getName(), h + 6, v, { font: Tools.statusF, color: fg });
      } else {
        next = 1;
        const title = Constants.rankTitle[row.select(next)?.toInteger() ?? 0] ?? "";
        this.label(title + row.getName(), h + 6, v, { font: Tools.statusF, color: fg });
      }
      let h2 = SHOWLEFT;
      for (;;) {
        next++;
        const it2 = row.select(next);
        if (it2 === null) {
          break;
        }
        this.label(it2.getName(), h2, v, { font: Tools.textF, color: fg });
        h2 += SHOWWIDE;
      }
    }
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway()) {
      return true;
    }
    if (e.target === this.done) {
      Tools.setRegion(this.getHome());
    }
    for (let i = 0; i < 5; i++) {
      if (this.ranks[i] === e.target) {
        this.which = i;
        break;
      }
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.setForeground(COLORS.black);
    this.setFont(Tools.textF);
    this.done = new Button("Done");
    this.ranks = new Array<Button>(5);
    for (let i = 0; i < this.ranks.length; i++) {
      this.ranks[i] = new Button(rankStr[i]!);
    }
    this.scroll = new FScrollbar();
    this.scroll.reshape(384, 0, 16, Tools.DEFAULT_HEIGHT);
    this.scroll.setAll(0, this.start, 1, SHOWROWS);
    this.done.reshape(5, 277, 50, 20);
    for (let i2 = 0; i2 < this.ranks.length; i2++) {
      this.ranks[i2]!.reshape(75 + 60 * i2, 277, 50, 20);
    }
  }

  /** Java `addTools()`. */
  override addTools(): void {
    this.add(this.done);
    this.add(this.scroll);
    for (let i = 0; i < this.ranks.length; i++) {
      this.add(this.ranks[i]!);
    }
  }

  /** Java `digest(Buffer)`: five `itList` boards, empty when the file is stubbed. */
  digest(buf: Buffer): void {
    const lists = new Array<itList>(5);
    for (let i = 0; i < lists.length; i++) {
      const it = Item.factory(buf);
      lists[i] = it instanceof itList ? it : new itList("");
    }
    this.lists = lists;
  }
}
