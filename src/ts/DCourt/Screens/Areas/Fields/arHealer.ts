/**
 * arHealer - the DOM port of `DCourt.Screens.Areas.Fields.arHealer`
 * (Java: `Elden Bishop's Temple of Brotherly Sharing`).
 *
 * A plain `Screen` (not an `Indoors`): it paints its own exit portrait and
 * the temple face, then five priced "healing" buttons that mutate the hero
 * (`subWounds`, `learn`, `getTemp().zero/clrTrait`, ...).  All game logic and
 * text are kept verbatim; only the AWT calls become DOM widgets.
 *
 * Port notes:
 *  - `createTools()` runs on the first `init()` in the DOM port, so the
 *    portrait widgets are registered there rather than in the constructor.
 *  - Java integer division is `Math.trunc(...)`.
 *  - `itHero` is reached through `Tools.getHero()` (a `HeroLike`/loose view),
 *    exactly like the Java statics.
 */

import { Tools } from "../../../Tools/Tools";
import { Constants } from "../../../Static/Constants";
import { Screen } from "../../../ui/screen";
import { Portrait } from "../../../ui/portrait";
import { Button } from "../../../ui/button";
import { COLORS, color } from "../../../ui/dom";
import type { GameEvent } from "../../../ui/widget";

/** Java `arHealer.text`. */
const text: string[] = [
  "Minor Healing",
  "Half Healing",
  "Full Healing",
  "Tithe",
  "Cure Disease",
];

/**
 * Java `arHealer.greeting`.  Index 0 is filled in by `createTools()` with the
 * current best hero ("Be brave like <best>"); Java left it null and the port
 * uses "" until then so `Tools.select` keeps its `readonly string[]` type.
 */
const greeting: string[] = [
  "",
  "How may I aid thee?",
  "Please let me help",
  "Care for a massage?",
  "Let me heal thy aches",
  "Thou art distressed",
  "Thou art disturbed",
  "Share with the poor",
  "Can you spare some marks?",
  "Tithe for thy soul",
  "Alms for the poor?",
];

export class arHealer extends Screen {
  private tools!: Button[];
  private cost!: number[];

  constructor(from: Screen | null) {
    super(from, "Elden Bishop's Temple of Brotherly Sharing");
    this.setBackground(color(128, 255, 128));
    this.setForeground(COLORS.black);
    this.setFont(Tools.textF);
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    super.localPaint();
    this.updateTools();
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    const h = Tools.getHero();
    const wounds = h.getWounds();
    const level = h.getLevel();
    if (Tools.movedAway(this)) return true;
    if (e.target === this.getPic(0)) Tools.setRegion(this.getHome());

    for (let i = 0; i < this.tools.length; i++) {
      if (e.target !== this.tools[i]) continue;
      h.subMoney(this.cost[i]);
      switch (i) {
        case 0:
          h.subWounds(Math.trunc(wounds / 4));
          break;
        case 1:
          h.subWounds(Math.trunc(wounds / 2));
          break;
        case 2:
          h.subWounds(wounds);
          break;
        case 3:
          if (level + 14 <= h.getAge()) {
            h.learn(Math.trunc(this.cost[3] / (level * level)));
            const num = h.getRaise();
            if (h.getExp() > num) h.getStatus().fix(Constants.EXP, num);
          }
          break;
        case 4:
          h.getTemp().zero("Disease");
          h.getTemp().clrTrait("Blind");
          h.getTemp().clrTrait("Panic");
          break;
      }
      break;
    }
    this.repaint();
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    greeting[0] = "Be brave like " + Tools.getPlayer().getBest();
    this.addPic(new Portrait("Exit.jpg", 320, 230, 64, 32));
    this.addPic(new Portrait("Faces/Elden.jpg", Tools.select(greeting), 10, 30, 144, 192));

    const count = text.length;
    this.tools = new Array<Button>(count);
    this.cost = new Array<number>(count).fill(0);
    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i] = new Button();
      this.tools[i].reshape(180, 40 + i * 30, 180, 25);
      this.tools[i].setFont(Tools.statusF);
    }
  }

  /** Java `addTools()`. */
  override addTools(): void {
    for (let i = 0; i < this.tools.length; i++) this.add(this.tools[i]);
  }

  /** Java `updateTools()`. */
  updateTools(): void {
    const h = Tools.getHero();
    const cash = h.getMoney();
    const wounds = h.getWounds();
    const disease = h.disease();
    let level = h.getLevel() - h.getSocial() - 1;
    const mercy = h.getLevel() === 1;
    if (level < 1) level = 1;

    this.cost[0] = 2 * Math.trunc(wounds / 4);
    this.cost[1] = 2 * Math.trunc(wounds / 2);
    this.cost[2] = 2 * wounds;
    this.cost[3] = Math.trunc((cash + 9) / 10);
    this.cost[4] =
      disease > 0 || h.hasTrait("Blind") || h.hasTrait("Panic")
        ? mercy
          ? 1
          : 10 * level
        : 0;

    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i].enable(this.cost[i] !== 0 && cash >= this.cost[i]);
      this.tools[i].setLabel(text[i] + " $" + this.cost[i]);
    }
  }
}
