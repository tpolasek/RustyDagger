/**
 * arBattle - the port of `DCourt.Screens.Quest.arBattle`.
 *
 * The red "combat" screen: two portraits, a transcript of this round's blows
 * (`text`) and, when the round was entered with a message (`events`), a notice
 * shown first.  A single click anywhere advances the fight by calling
 * `quest.battleActionResult()`, which decides whether the quest continues,
 * rewards the hero, or ends.
 *
 * The combat maths is a line-for-line port of `battle()` / `agentAct()` /
 * `actorControls()` / `actorSwindles()` / `spellEffects()` / `combatEvents()`,
 * including the Java integer divisions (`Math.trunc` here) and the ordering of
 * messages.  `power`/`effect` index the "hit quality" the roll produced, exactly
 * as in Java (`Tools.twice(3)` gives 0..4).
 */

import { itAgent } from "../../Items/List/itAgent";
import type { itHero } from "../../Items/List/itHero";
import { itMonster } from "../../Items/List/itMonster";
import { Tools } from "../../Tools/Tools";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { GearTypes } from "../../Static/GearTypes";
import { COLORS, color } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import type { GameEvent } from "../../ui/widget";
import { arNotice } from "../Utility/arNotice";
import type { arQuest } from "./arQuest";

/** Java `int` division: truncates toward zero (Math.trunc). */
function idiv(num: number, den: number): number {
  return Math.trunc(num / den);
}

export class arBattle extends Screen {
  /** Java `ABUF`. */
  private static readonly ABUF = "    ---";

  /*
   * Java also declared `berzerks` and `backstabs` here; they are never read by
   * arBattle (kept for parity with the source, which carried them over).
   */
  private static readonly berzerks = [
    "With a scream of fury, you tear into it!",
    "Foaming at the mouth you leap onto it!",
    "You attack like a whirlwind, screaming!",
    "KILL!  KILL!  KILL!  KILL!  KILL!  KILL!",
  ];

  private static readonly backstabs = [
    "You pat it on the back with a knife",
    "You point down \"Hey your shoes are untied\"",
    "You pretend to leave, but circle back!",
    "I'm your best friend - DIE! DIE! DIE!",
  ];

  private readonly power = ["Fly Swat", "Weak Blow", "Good Hit", "Potent Hit", "POWER HIT!"];

  private readonly effect = [
    "DODGED!",
    "Unharmed",
    "Scratched",
    "Injured!",
    "Wounded!!",
    "KILLED!!!",
  ];

  /** Set when somebody died this round; stops the second blow of the round. */
  private killStop = false;

  private hero!: itHero;

  private mob!: itMonster;

  private quest!: arQuest;

  private events: string;

  private text: string;

  constructor(from: arQuest, msg: string | null) {
    super(from, "Battle Screen");
    this.hideStatusBar();
    this.setBackground(color(192, 0, 0));
    this.setForeground(COLORS.white);
    this.setFont(Tools.courtF);
    this.hero = Screen.getHero() as unknown as itHero;
    this.quest = from;
    this.mob = from.getMob();
    this.addPic(this.mob.getPicture());
    this.getPic(0)!.reshape(10, 10, 160, 160);
    this.addPic(this.hero.getPicture());
    this.getPic(1)!.reshape(230, 10, 160, 160);
    this.text = this.battle(this.hero, this.mob);
    this.events = this.combatEvents(msg);
  }

  override init(): void {
    super.init();
    if (this.events.length > 0) {
      Tools.setRegion(new arNotice(this, this.events));
      this.events = "";
    }
  }

  override localPaint(): void {
    // Java walked the string on '\n': the first line lands at y=190, the next
    // at 210, and the (unterminated) remainder at v + 20.
    let v = 170;
    let msg = this.text;
    const font = this.getFont();
    const fg = this.getForeground();
    for (;;) {
      const ix = msg.indexOf("\n");
      if (ix === -1) {
        this.label(msg, 5, v + 20, { font, color: fg });
        return;
      }
      v += 20;
      this.label(msg.substring(0, ix), 5, v, { font, color: fg });
      msg = msg.substring(ix + 1);
    }
  }

  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) return true;
    this.hero.clearDump();
    this.quest.battleActionResult();
    return true;
  }

  battle(hero: itAgent, mob: itAgent): string {
    let heroFirst: boolean;
    let hguts = hero.getGuts();
    let hspeed = hero.skill();
    let hhit = Tools.twice(3);
    let mguts = mob.getGuts();
    let mspeed = mob.skill();
    let mhit = Tools.twice(3);
    const ha = hero.getActions();
    const ma = mob.getActions();
    if (ha.isMatch(Constants.BACKSTAB)) {
      hguts *= 2;
      hspeed *= 2;
      mhit = 1;
    } else if (ha.isMatch(Constants.BERZERK) || ha.isMatch(Constants.IEATSU)) {
      hguts *= 2;
      hspeed *= 2;
      hhit = 4;
    } else if (ha.isMatch("Control")) {
      hspeed = hero.getWits();
    } else if (ha.isMatch("Swindle")) {
      hspeed = hero.getCharm();
    }
    if (hero.hasTrait(Constants.REFLEX)) {
      hspeed += 30;
    }
    if (hero.hasTrait("Blind")) {
      hspeed = idiv(hspeed, 2);
      hhit = idiv(hhit, 2);
    }
    if (ma.isMatch(Constants.BACKSTAB)) {
      mguts *= 2;
      mspeed *= 2;
      hhit = 1;
    } else if (ma.isMatch(Constants.BERZERK) || ma.isMatch(Constants.IEATSU)) {
      mguts *= 2;
      mspeed *= 2;
      mhit = 4;
    } else if (ma.isMatch("Control")) {
      mspeed = mob.getWits();
    } else if (ma.isMatch("Swindle")) {
      mspeed = mob.getCharm();
    }
    if (mob.hasTrait(Constants.REFLEX)) {
      mspeed += 30;
    }
    if (mob.hasTrait("Blind")) {
      mspeed = idiv(mspeed, 2);
      mhit = idiv(mhit, 2);
    }
    if (ma.isMatch(Constants.RUNAWAY) && !ha.isMatch(Constants.RUNAWAY)) {
      heroFirst = true;
    } else if (!ha.isMatch(Constants.RUNAWAY) || ma.isMatch(Constants.RUNAWAY)) {
      heroFirst = Tools.contest(hspeed, mspeed);
    } else {
      heroFirst = false;
    }
    let msg: string;
    if (heroFirst) {
      msg = this.agentAct(hero, mob, hguts, hhit, hspeed, mspeed);
      if (!this.killStop) {
        msg += this.agentAct(mob, hero, mguts, mhit, mspeed, hspeed);
      }
    } else {
      msg = this.agentAct(mob, hero, mguts, mhit, mspeed, hspeed);
      if (!this.killStop) {
        msg += this.agentAct(hero, mob, hguts, hhit, hspeed, mspeed);
      }
    }
    return msg;
  }

  agentAct(at: itAgent, df: itAgent, guts: number, hit: number, as: number, ds: number): string {
    const act = at.getActions();
    let useBlast = false;
    if (act.isMatch("Control")) {
      return this.actorControls(at, df, 2 * at.getWits());
    }
    if (act.isMatch("Swindle")) {
      return this.actorSwindles(at, df, 2 * at.getCharm());
    }
    if (act.isMatch(Constants.BACKSTAB)) {
      at.thief(1);
      if (df.hasTrait(Constants.ALERT)) {
        ds += 30;
      }
    }
    if (act.isMatch(Constants.BERZERK)) {
      at.fight(1);
      if (df.hasTrait(Constants.FENCER)) {
        ds += 30;
      }
    }
    if (act.isMatch(Constants.IEATSU)) {
      at.ieatsu(1);
      if (df.hasTrait(Constants.FENCER)) {
        ds += 30;
      }
    }
    const weapon = at.getGear().findArms(ArmsTrait.RIGHT);
    if (weapon !== null && weapon.hasTrait(ArmsTrait.BLAST)) {
      at.getActions().add(ArmsTrait.BLAST, 1);
    }
    let dmg: number;
    let stk: number;
    if (Tools.roll(ds) > as) {
      dmg = 0;
      stk = 0;
    } else {
      dmg = idiv(guts * (2 + hit), 10) + at.getAttack() - df.getDefend();
      const val = 25 * at.getActions().getCount(ArmsTrait.BLAST);
      useBlast = val > dmg;
      if (useBlast) {
        dmg = val;
      } else {
        at.getActions().drop(ArmsTrait.BLAST);
      }
      const val2 = df.getGuts() - df.getWounds();
      if (dmg < 1) {
        stk = 1;
      } else {
        stk = dmg >= val2 ? 5 : 2 + idiv(3 * dmg, val2);
      }
    }
    if (stk > 1) {
      df.addWounds(dmg);
    }
    if (stk === 5) {
      this.killStop = true;
      df.setState(itAgent.DEAD);
    }
    if (weapon !== null) {
      if (weapon.hasTrait("Blind")) {
        at.getActions().add("Blind", 1);
      }
      if (weapon.hasTrait("Panic")) {
        at.getActions().add("Panic", 1);
      }
      if (!useBlast && weapon.hasTrait("Disease")) {
        at.getActions().add("Disease", idiv(dmg + 3, 5));
      }
    }
    const head =
      at.getName() +
      ":" +
      (act.isMatch(Constants.ATTACK) ? this.power[hit] : act.getName());
    return (
      head +
      "\n" +
      arBattle.ABUF +
      df.getName() +
      " " +
      this.effect[stk] +
      this.spellEffects(at, df) +
      "\n"
    );
  }

  actorControls(at: itAgent, df: itAgent, as: number): string {
    at.magic(1);
    const msg = at.getName() + " tries Hypnosis!\n";
    let ds = df.getWits();
    if (df.hasTrait(Constants.STUBBORN)) {
      ds += 30;
    }
    if (Tools.contest(as, ds)) {
      at.setState("Control");
      this.killStop = true;
      return msg + arBattle.ABUF + df.getName() + " is Mesmerized!\n";
    }
    return msg + "    ---But the " + df.getName() + " Resists!\n";
  }

  actorSwindles(at: itAgent, df: itAgent, as: number): string {
    at.thief(1);
    const msg = at.getName() + " starts 'Trading'!\n";
    let ds = df.getCharm();
    if (df.hasTrait(Constants.CLEVER)) {
      ds += 30;
    }
    if (Tools.contest(as, ds)) {
      at.setState("Swindle");
      this.killStop = true;
      return msg + arBattle.ABUF + df.getName() + " falls for It!\n";
    }
    return msg + "    ---But the " + df.getName() + " is too Cunning!\n";
  }

  spellEffects(at: itAgent, df: itAgent): string {
    let msg = "";
    for (const it of at.getActions().elements()) {
      if (it.isMatch("Blind") && Tools.contest(at.getWits() * it.getCount(), df.getWits())) {
        msg += " *BLIND*";
        df.getTemp().fixTrait("Blind");
      }
      if (it.isMatch("Panic") && Tools.contest(at.getWits() * it.getCount(), df.getWits())) {
        msg += " +PANIC+";
        if (df instanceof itMonster) {
          df.setPassive();
        }
        df.getTemp().fixTrait("Panic");
      }
      if (it.isMatch("Disease") && it.getCount() > 0) {
        msg += " ^Sick^";
        if (df.hasTrait(Constants.HARDY)) {
          df.ail(idiv(it.getCount(), 2));
        } else {
          df.ail(it.getCount());
        }
      }
      if (it.isMatch(ArmsTrait.BLAST)) {
        msg += " >KABOOM<";
      }
    }
    return msg;
  }

  combatEvents(msgIn: string | null): string {
    const ma = this.mob.getActions();
    let msg = msgIn ?? "";
    const num = ma.getCount(GearTypes.GINSENG);
    if (num > 0) {
      msg +=
        "\tThe " +
        this.mob.getName() +
        " gains energy by eating " +
        num +
        " " +
        GearTypes.GINSENG +
        "\n";
    }
    if (ma.getCount(GearTypes.SELTZER) > 0) {
      msg +=
        "\tThe " +
        this.mob.getName() +
        " washes dust from its " +
        "eyes by using " +
        GearTypes.SELTZER +
        "\n";
    }
    const val = ma.getCount(GearTypes.APPLE);
    const num2 = ma.getCount(GearTypes.SALVE);
    if (val > 0 || num2 > 0) {
      let msg2 = msg + "\tThe " + this.mob.getName() + " swallows";
      if (val > 0) {
        msg2 += " " + val + " " + GearTypes.APPLE;
      }
      if (val > 0 && num2 > 0) {
        msg2 += " and";
      }
      if (num2 > 0) {
        msg2 += " " + num2 + " " + GearTypes.SALVE;
      }
      msg = msg2 + " healing its wounds.\n";
      for (let ix = 0; ix < val; ix++) {
        this.mob.doRevive();
        this.mob.subPack(GearTypes.APPLE, 1);
      }
      for (let ix = 0; ix < num2; ix++) {
        this.mob.doHeal();
        this.mob.subPack(GearTypes.SALVE, 1);
      }
    }
    const val2 = ma.getCount(GearTypes.TROLL);
    if (val2 > 0) {
      msg += "\tThe " + this.mob.getName() + " regenerates!\n";
      for (let ix = 0; ix < val2; ix++) {
        this.mob.doRevive();
        this.mob.subPack(GearTypes.TROLL, 1);
      }
    }
    if (ma.isMatch(Constants.GOAT)) {
      msg += this.mob.goatSkill();
    }
    if (ma.isMatch(Constants.WORM)) {
      msg += this.mob.wormSkill();
    }
    return msg;
  }
}
