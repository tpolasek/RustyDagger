/**
 * arFinish - the DOM port of `DCourt.Screens.Command.arFinish`.
 *
 * The "Time to Finally Rest" summary shown by `arExit` after a successful save:
 * a final picture chosen from where the hero slept, today's gains next to it and
 * the lifetime statistics below.  `Lists` opens `arRanking`, `Credits` opens the
 * `arNotice` credit text.
 *
 * Port notes:
 *  - Java's field initializers (`itHero hero = Screen.getHero();`,
 *    `itList start = Screen.getPlayer().getStart();`) run at construction time;
 *    in TS that is the top of the constructor body (class fields would also work,
 *    but the constructor keeps the Java order visible);
 *  - `Portrait(path, "", x, y, w, h)` paints the sleeping picture with an empty
 *    caption, exactly as the Java `addPic` call did.
 */

import { Constants } from "../../Static/Constants";
import { GameStrings } from "../../Static/GameStrings";
import { type itHero } from "../../Items/List/itHero";
import { type itList } from "../../Items/itList";
import { COLORS, color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Portrait } from "../../ui/portrait";
import { Button } from "../../ui/button";
import type { GameEvent } from "../../ui/widget";
import { Tools } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";
import { arRanking } from "./arRanking";

/** Java `arFinish.path`. */
const path: string[] = ["Final/Bed.jpg", "Final/Floor.jpg", "Final/Camp.jpg", "Final/Dead.jpg"];

/** Java `arFinish.which`: place index -> picture index (3 = dead). */
const which: number[] = [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2];

export class arFinish extends Screen {
  /** Java `itHero hero = Screen.getHero()`. */
  private hero: itHero;
  /** Java `itList start = Screen.getPlayer().getStart()`. */
  private start: itList;
  private lists!: Button;
  private credits!: Button;

  constructor() {
    super("Time to Finally Rest");
    this.hero = Screen.getHero() as itHero;
    this.start = Screen.getPlayer().getStart() as itList;
    this.setBackground(color(255, 128, 128));
    this.setForeground(color(64, 32, 32));
    this.setFont(Tools.statusF);
    this.hideStatusBar();
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    this.label(this.getTitle(), 10, 15, { font: Tools.courtF });
    this.label("Today's Gains:", 260, 55, { font: Tools.courtF });
    this.label(
      "Statistics for " + this.hero.getTitle() + this.hero.getName(),
      10,
      195,
      { font: Tools.courtF },
    );
    this.label("Reload/Refresh to Play Again", 10, 295, { font: Tools.courtF });

    let v = 62;
    if (this.guts() !== 0) {
      v = 62 + 20;
      this.label(this.value(Constants.GUTS, this.guts()), 275, v, { font: Tools.statusF });
    }
    if (this.wits() !== 0) {
      v += 20;
      this.label(this.value(Constants.WITS, this.wits()), 275, v, { font: Tools.statusF });
    }
    if (this.charm() !== 0) {
      v += 20;
      this.label(this.value(Constants.CHARM, this.charm()), 275, v, { font: Tools.statusF });
    }
    if (this.attack() !== 0) {
      v += 20;
      this.label(this.value(Constants.ATTACK, this.attack()), 275, v, { font: Tools.statusF });
    }
    if (this.defend() !== 0) {
      v += 20;
      this.label(this.value(Constants.DEFEND, this.defend()), 275, v, { font: Tools.statusF });
    }
    if (this.skill() !== 0) {
      v += 20;
      this.label(this.value(Constants.SKILL, this.skill()), 275, v, { font: Tools.statusF });
    }
    if (this.quests() !== 0) {
      v += 20;
      this.label(this.value("Quests", this.quests()), 275, v, { font: Tools.statusF });
    }
    if (v === 62) {
      this.label("Spirit!", 275, v + 20, { font: Tools.statusF });
    }
    if (this.level() > 0) {
      this.label(
        "Power burns within you: " + this.value(Constants.LEVEL, this.level()),
        20,
        220,
        { font: Tools.statusF },
      );
    } else {
      this.label(
        "Difficult lessons learned: " + this.value(Constants.EXP, this.exp()),
        20,
        220,
        { font: Tools.statusF },
      );
    }
    this.label(
      "Your legend has " +
        (this.fame() < 0 ? "declined" : "grown") +
        ": " +
        this.value(Constants.FAME, this.fame()),
      20,
      245,
      { font: Tools.statusF },
    );
    this.label(
      "Wealth accumulates " +
        (this.money() < 0 ? "slowly" : "rapidly") +
        ": " +
        this.value("Marks", this.money()),
      20,
      270,
      { font: Tools.statusF },
    );
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway()) {
      return true;
    }
    if (e.target === this.credits) {
      Tools.setRegion(new arNotice(this, GameStrings.creditText));
    } else if (e.target === this.lists) {
      Tools.setRegion(new arRanking(this));
    } else {
      this.repaint();
    }
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    let val: number;
    if (Screen.getPlayer().isDead()) {
      val = 3;
    } else {
      const i = Constants.PLACE_LIST.firstOf(Screen.getPlace());
      val = i < 0 || i >= 11 ? 3 : (which[i] ?? 3);
    }
    this.addPic(new Portrait(path[val] ?? path[3]!, "", 5, 20, 240, 160));
    this.lists = new Button("Lists");
    this.lists.reshape(260, 10, 60, 20);
    this.lists.setFont(Tools.textF);
    this.credits = new Button("Credits");
    this.credits.reshape(330, 10, 60, 20);
    this.credits.setFont(Tools.textF);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    this.add(this.lists);
    this.add(this.credits);
  }

  /** Java `value(String, int)`: "+3 Guts" / "-2 Fame". */
  value(what: string, val: number): string {
    return val < 0 ? `${val} ${what}` : `+${val} ${what}`;
  }

  /** Java `startCount(String)`: the hero's value for `id` when play began. */
  startCount(id: string): number {
    return this.start.getCount(id);
  }

  guts(): number {
    return this.hero.getGuts() - this.startCount(Constants.GUTS);
  }

  wits(): number {
    return this.hero.getWits() - this.startCount(Constants.WITS);
  }

  charm(): number {
    return this.hero.getCharm() - this.startCount(Constants.CHARM);
  }

  attack(): number {
    return this.hero.getAttack() - this.startCount(Constants.ATTACK);
  }

  defend(): number {
    return this.hero.getDefend() - this.startCount(Constants.DEFEND);
  }

  skill(): number {
    return this.hero.getSkill() - this.startCount(Constants.SKILL);
  }

  quests(): number {
    return 3 * (this.hero.getLevel() - this.startCount(Constants.LEVEL));
  }

  level(): number {
    return this.hero.getLevel() - this.startCount(Constants.LEVEL);
  }

  exp(): number {
    return this.hero.getExp() - this.startCount(Constants.EXP);
  }

  fame(): number {
    return this.hero.getFame() - this.startCount(Constants.FAME);
  }

  money(): number {
    return this.hero.getMoney() - this.startCount("Marks");
  }
}
