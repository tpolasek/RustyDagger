/**
 * arQuest - the port of `DCourt.Screens.Quest.arQuest`.
 *
 * One random encounter: a copy of the monster template sized for `weight`, the
 * option menu built from the monster's `opts` list, and every reward / action
 * handler (`tryBribe`, `tryRiddle`, `heroWins`, ...).  The on-screen "battle"
 * itself lives in `arBattle`; this screen builds it and consumes its result
 * through `battleActionResult()`.
 *
 * Layout is the Java one: yellow panel, blue centered title, green header lines
 * with the hero-visible monster stats, and up to five wrapped lines of the
 * monster's flavour text at the bottom.  The wrapping uses the ported `Breaker`
 * with a `FontMetrics` adapter built from the CSS metrics of the `questF` slot
 * (Java asked AWT for the metrics of the current font).
 *
 * `gate` is the screen the fight returns to on a win/escape (Java's `gate`
 * field); a plain `getHome()` unless the five-argument constructor supplied one.
 */

import { itList } from "../../Items/itList";
import type { itHero } from "../../Items/List/itHero";
import type { itMonster } from "../../Items/List/itMonster";
import { Breaker, type FontMetrics } from "../../Tools/Breaker";
import { Tools } from "../../Tools/Tools";
import { Constants } from "../../Static/Constants";
import { GearTypes } from "../../Static/GearTypes";
import { QuestStrings } from "../../Static/QuestStrings";
import { COLORS, fontAscent, lineHeight, textWidth } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import type { ItemLike } from "../../ui/session";
import { sharedStatusPic } from "../../ui/statusPic";
import type { GameEvent } from "../../ui/widget";
import { arNotice } from "../Utility/arNotice";
import { arStatus } from "../Utility/arStatus";
import { arBattle } from "./arBattle";
import {
  ATTACK,
  BACKSTAB,
  BERZERK,
  BRIBE,
  BUSHIDO,
  CAPTURE,
  CARP,
  CONTROL,
  FEED,
  HELP,
  IEATSU,
  Options,
  RIDDLE,
  RUNAWAY,
  SEDUCE,
  SPELLS,
  SWINDLE,
  TRADE,
} from "./Options";

/** Java `int` division: truncates toward zero (Math.trunc). */
function idiv(num: number, den: number): number {
  return Math.trunc(num / den);
}

/**
 * `FontMetrics` for the `questF` slot.  Java measured the real font; here the
 * CSS metrics stand in for it (see `ui/dom.ts`).
 */
const QUEST_METRICS: FontMetrics = {
  stringWidth: (text: string) => textWidth(text, "questF"),
  charWidth: (code: number) => textWidth(String.fromCharCode(code), "questF"),
  getAscent: () => fontAscent("questF"),
  getHeight: () => lineHeight("questF"),
};

/** Baseline offset of the quest text (`FontMetrics.getAscent`). */
const QUEST_ASCENT = fontAscent("questF");

/** `FontMetrics.getAscent() + getDescent()` - the line jump Java used. */
const QUEST_JUMP = lineHeight("questF");

export class arQuest extends Screen {
  private mob!: itMonster;

  private hero!: itHero;

  private opt!: Options;

  private weight = 0;

  /** Screen the quest returns to when the monster is beaten or fled from. */
  private gate!: Screen;

  /** Java `arQuest.trains` - the Ieatsu training text (kept verbatim). */
  static readonly trains =
    "\tYou are taken to a remote location in the forest where you undergo a bizzare training regimen.  You shower naked beneath a freezing waterfall.  You eat nothing but rice and fish.  You must sit for hours in a lotus position while  contemplating the sound of a single hand clapping.\n\tWhen the time comes to draw your blade, you find that an unheralded clarity of vision guides your stroke.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Samurai Skill >>>\n\n\t*** The Cost to Your Body is Severe ***\n\t*** -3 Guts  -3 Wits  -3 Charm ***\n";

  /**
   * Java overloads:
   *   arQuest(Screen a, Screen n, int w, String m, itMonster b)  -> gate = n
   *   arQuest(Screen from, int wgt, String msg, itMonster beast) -> gate = home
   *
   * The monster parameter accepts the loose `ItemLike` that `Screen.findBeast`
   * hands back (it was a plain `itMonster` in Java, where `findBeast` returned
   * `itMonster` too); it is copied and balanced, never kept by reference.
   */
  public constructor(a: Screen | null, n: Screen, w: number, m: string, b: ItemLike | null);

  public constructor(from: Screen | null, wgt: number, msg: string, beast: ItemLike | null);

  public constructor(
    aOrFrom: Screen | null,
    nOrWgt: Screen | number,
    wOrMsg: number | string,
    mOrBeast: string | ItemLike | null,
    beast?: ItemLike | null,
  ) {
    const fiveArg = typeof nOrWgt !== "number";
    const from = aOrFrom;
    const msg = fiveArg ? (mOrBeast as string) : (wOrMsg as string);
    super(from, msg);

    const wgt = fiveArg ? (wOrMsg as number) : nOrWgt;
    // Java declared the parameter as itMonster and would have thrown an NPE on
    // a missing template; the cast keeps the same shape here.
    const mob = (fiveArg ? beast : mOrBeast) as unknown as itMonster;

    // Java: gate = getHome(); the five-argument form then overwrote it.
    this.gate = fiveArg ? (nOrWgt as Screen) : (this.getHome() as Screen);
    this.setBackground(COLORS.yellow);
    this.setForeground(COLORS.black);
    this.setFont(Tools.courtF);
    this.weight = wgt;
    this.hero = Screen.getHero() as unknown as itHero;
    this.mob = mob.copy() as itMonster;
    this.mob.balance(this.weight);
    this.opt = new Options(this.mob.getOptions());
    this.opt.reshape(180, 20, 200, 110);
    this.hero.addFatigue(1);
    this.hero.resetActions();
    this.mob.resetActions();
    this.mob.chooseActions(true);
  }

  override init(): void {
    super.init();
    if (Screen.getActions().isMatch(Constants.SPELLS)) {
      Tools.setRegion(this.applyChoice(SPELLS));
    }
    this.opt.fixList();
  }

  override addTools(): void {
    this.addPic(this.mob.getPicture());
    this.getPic(0)!.reshape(10, 10, 160, 160);
    this.add(this.opt);
    super.addTools();
  }

  override localPaint(): void {
    this.center(this.getTitle(), 280, 15, { font: Tools.courtF, color: COLORS.blue });

    // Java: g.setColor(new Color(0, 128, 0)) for the monster stats block.
    const hurt = this.mob.getWounds();
    this.label(
      "Guts: " + (this.mob.getGuts() - hurt) + (hurt > 0 ? "/" + this.mob.getGuts() : ""),
      180,
      145,
      { font: Tools.courtF, color: COLORS.green },
    );
    this.alignRight(this.mob.getWeapon(), 390, 145, { font: Tools.courtF, color: COLORS.green });
    this.label("Wits: " + this.mob.getWits(), 180, 165, { font: Tools.courtF, color: COLORS.green });
    this.alignRight(this.mob.getArmour(), 390, 165, { font: Tools.courtF, color: COLORS.green });

    const lines = new Breaker(this.mob.getText(), QUEST_METRICS, 380, false);
    for (let ix = 0; ix < 5 && ix < lines.lineCount(); ix++) {
      this.label(lines.getLine(ix) ?? "", 10, 175 + QUEST_ASCENT + ix * QUEST_JUMP, {
        font: Tools.questF,
        color: COLORS.black,
      });
    }
  }

  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) return true;
    if (e.target === sharedStatusPic()) Tools.setRegion(new arStatus(this, true));
    if (e.target !== this.opt) return true;
    Tools.setRegion(this.applyChoice(this.opt.select()));
    return true;
  }

  battleActionResult(): void {
    let next: Screen;
    if (this.hero.isDead()) {
      next = this.hero.killedScreen(this.getHome() as Screen, null, true);
    } else if (this.hero.isControl()) {
      next = this.heroControls("");
    } else if (this.hero.isSwindle()) {
      next = this.heroSwindles();
    } else if (this.mob.isDead()) {
      next = this.heroWins();
    } else if (this.mob.isControl()) {
      next = this.mobControls("");
    } else if (this.mob.isSwindle()) {
      next = this.mobSwindles();
    } else {
      this.hero.resetActions();
      this.opt.nextRound(this.hero, this.mob);
      this.mob.resetActions();
      this.mob.chooseActions(false);
      next = this;
    }
    Tools.setRegion(next);
  }

  /**
   * Java `applyChoice(int)`.  The numbers are the option list values from
   * `Options`; the outer cases 12..15 are the effect numbers `GearTypes` uses
   * for "flee" / "fish" / "bushido" / "capture" options.
   */
  applyChoice(choice: number): Screen {
    const ma = this.mob.getActions();
    const ha = this.hero.getActions();
    switch (choice) {
      case BRIBE:
        return this.tryBribe();
      case FEED:
        return this.trySupply(GearTypes.FOOD, 1);
      case RIDDLE:
        return this.tryRiddle();
      case TRADE:
        return this.tryTrade();
      case HELP:
        return this.tryAssist();
      case SEDUCE:
        return this.trySeduce();
      default: {
        switch (choice) {
          case CONTROL:
            ha.setName("Control");
            break;
          case BACKSTAB:
            ha.setName(Constants.BACKSTAB);
            break;
          case BERZERK:
            ha.setName(Constants.BERZERK);
            break;
          case SWINDLE:
            ha.setName("Swindle");
            break;
          case IEATSU:
            ha.setName(Constants.IEATSU);
            break;
          case ATTACK:
            ha.setName(Constants.ATTACK);
            break;
          case SPELLS:
            ha.setName(Constants.SPELLS);
            break;
        }
        if (ma.isMatch(Constants.RUNAWAY)) {
          return this.mobFlees();
        }
        if (ha.isMatch(ma.getName())) {
          switch (choice) {
            case CONTROL:
              return this.stareDown();
            case SWINDLE:
              return this.swapGoods();
          }
        }
        return new arBattle(this, null);
      }
      case RUNAWAY:
        return this.tryFlee();
      case CARP:
        return this.trySupply(GearTypes.FISH, 13);
      case BUSHIDO:
        return this.tryToken();
      case CAPTURE:
        return this.tryCapture();
    }
  }

  getMob(): itMonster {
    return this.mob;
  }

  heroWins(): Screen {
    const exp =
      this.mob.baseExp() +
      idiv((2 * this.mob.getGuts() + this.mob.getWits() + this.mob.getCharm()) * this.weight, 4);
    this.hero.setState(Constants.VICTORY);
    let msg =
      "You have slain the " +
      this.mob.getName() +
      " with tremendous valor.\n" +
      Screen.packString("\nYou Find: ", this.mob.getPack());
    this.hero.getPack().merge(this.mob.getPack());
    if (this.hero.getOverload() > 0) {
      msg += "*** YOUR PACK IS OVERLOADED ***\n";
    }
    msg += this.hero.gainExp(exp);
    this.hero.addStatus(Constants.FAME, this.mob.baseFame());
    if (this.hero.getActions().isMatch(Constants.BACKSTAB)) {
      msg += this.hero.gainCharm(this.weight * 3) + this.hero.gainGuts(this.weight * 2);
    } else if (this.hero.getActions().isMatch(Constants.BERZERK)) {
      msg += this.hero.gainGuts(this.weight * 5);
    } else {
      msg += this.hero.gainGuts(this.weight);
    }
    return new arNotice(this.gate, msg);
  }

  tryBribe(): Screen {
    const exp = this.mob.baseExp();
    const num = idiv(this.weight * (this.mob.getGuts() + this.mob.getWits()), 2);
    const cost = this.hero.subMoney(num);
    if (cost >= num && Tools.contest(this.hero.bribeCharm(), this.mob.bribeCharm())) {
      const msg =
        "\tYou have averted conflict by paying the " +
        this.mob.getName() +
        " " +
        cost +
        " marks...\n" +
        this.hero.gainExp(exp) +
        this.hero.gainCharm(this.weight);
      this.hero.subFatigue(1);
      return new arNotice(this.gate, msg);
    } else if (this.mob.isAggresive()) {
      this.mob.addMoney(cost);
      return new arBattle(
        this,
        "The " + this.mob.getName() + " takes " + cost + " marks, then attacks!\n",
      );
    } else {
      let msg: string;
      if (this.mob.isHostile()) {
        this.mob.addMoney(cost);
        msg = "\tThe " + this.mob.getName() + " takes " + cost + " marks, then " + "laughs at you!";
      } else {
        this.hero.addMoney(cost);
        msg = "The " + this.mob.getName() + " refuses your money...";
      }
      this.opt.remove(BRIBE);
      return new arNotice(this, msg);
    }
  }

  trySupply(id: string, choice: number): Screen {
    const exp = this.mob.baseExp();
    const num = idiv(this.mob.getGuts() + 4, 5);
    const cost = this.hero.subPack(id, num);
    if (cost >= num && Tools.contest(this.hero.feedCharm(), this.mob.feedCharm())) {
      const msg =
        "The " +
        this.mob.getName() +
        " chows down on " +
        cost +
        " " +
        id +
        ", the waddles away with satisfaction...\n" +
        this.hero.gainExp(exp) +
        this.hero.gainCharm(this.weight);
      this.hero.subFatigue(1);
      return new arNotice(this.gate, msg);
    } else if (this.mob.isAggresive()) {
      return new arBattle(
        this,
        "The " + this.mob.getName() + " eats your " + id + "..." + "then it attacks!\n",
      );
    } else {
      let msg: string;
      if (this.mob.isHostile()) {
        msg =
          "The " +
          this.mob.getName() +
          " eats " +
          cost +
          " " +
          id +
          "..." +
          "then blocks your path!\n";
      } else {
        this.hero.addPack("food", cost);
        msg =
          "The " +
          this.mob.getName() +
          " turns up it's " +
          "nose up at your " +
          id +
          "...\n";
      }
      this.opt.remove(choice);
      return new arNotice(this, msg);
    }
  }

  tryTrade(): Screen {
    const exp = this.mob.baseExp();
    const num = this.weight * (this.mob.getCharm() + this.mob.getWits());
    const cost = this.hero.subMoney(num);
    const gear = new itList(this.mob.getPack());
    gear.zero("marks");
    if (
      !gear.isEmpty() &&
      cost >= num &&
      Tools.contest(this.hero.tradeCharm(), this.mob.tradeCharm())
    ) {
      const msg =
        "You flash your marks at it until an agreeable price is reached...\n" +
        "\nYou spend " +
        cost +
        " marks.\n";
      this.mob.getPack().zero("marks");
      const msg2 = msg + Screen.packString("\nYou Recieve: ", this.mob.getPack());
      this.hero.getPack().merge(this.mob.getPack());
      return new arNotice(
        this.gate,
        msg2 + this.hero.gainExp(exp) + this.hero.gainCharm(this.weight),
      );
    } else if (this.mob.isAggresive()) {
      this.mob.addMoney(cost);
      return new arBattle(
        this,
        "\tThe " + this.mob.getName() + " takes " + cost + " marks, then attacks!\n",
      );
    } else if (this.mob.isHostile()) {
      this.mob.addMoney(cost);
      this.mob.setPassive();
      this.mob.getActions().setName(Constants.ATTACK);
      return this.mobFlees("\tIt steals " + cost + " marks!\n");
    } else {
      this.hero.addMoney(cost);
      const msg = "The " + this.mob.getName() + " shows no interest in trading...\n";
      this.opt.remove(TRADE);
      return new arNotice(this, msg);
    }
  }

  tryAssist(): Screen {
    const exp = this.mob.baseExp();
    if (Tools.contest(this.hero.getWits(), this.mob.getWits())) {
      const msg2 =
        "\tYou manage to fix the problem!\n\n\tThe " +
        this.mob.getName() +
        " is indebted to you for " +
        "your kind assistance...\n";
      this.mob.getPack().loseHalf();
      const msg3 = msg2 + Screen.packString("\nYou Recieve: ", this.mob.getPack());
      this.hero.getPack().merge(this.mob.getPack());
      this.hero.addStatus(Constants.FAME, this.weight);
      return new arNotice(
        this.gate,
        msg3 + this.hero.gainExp(exp) + this.hero.gainWits(this.weight),
      );
    } else if (this.mob.isAggresive()) {
      return new arBattle(this, "\tThe " + this.mob.getName() + " attacks while you busy!\n");
    } else {
      let msg: string;
      if (this.mob.isHostile()) {
        msg =
          "\tYou can't seem to solve the problem...\n" +
          "\n\tThe " +
          this.mob.getName() +
          " calls you a worthless loser!\n";
      } else {
        msg =
          "\tYou can't seem to solve the problem...\n" +
          "\n\tThe " +
          this.mob.getName() +
          " thanks you for your efforts.\n";
      }
      this.opt.remove(HELP);
      return new arNotice(this, msg);
    }
  }

  tryRiddle(): Screen {
    const exp = this.mob.baseExp();
    const which = Tools.roll(QuestStrings.riddle.length);
    const msg = "\t" + QuestStrings.riddle[which] + "\n\n\t";
    if (!Tools.contest(this.hero.getWits(), this.mob.getWits())) {
      const msg2 = msg + QuestStrings.guess[Tools.roll(QuestStrings.guess.length)] + "\n";
      this.opt.remove(RIDDLE);
      if (this.mob.isAggresive() || this.mob.isHostile()) {
        return new arBattle(this, msg2 + "\n\tWRONG!! SCREEEEECH!!!\n");
      }
      return new arNotice(this, msg2 + "\n\tThe " + this.mob.getName() + " shakes its head.\n");
    }
    const msg3 = msg + QuestStrings.answer[which] + "\n\n\tGARRGH! THAT'S RIGHT!!\n";
    this.mob.getPack().loseHalf();
    const msg4 = msg3 + Screen.packString("\nYou Recieve: ", this.mob.getPack());
    this.hero.getPack().merge(this.mob.getPack());
    const msg5 = msg4 + this.hero.gainExp(exp);
    this.hero.addStatus(Constants.FAME, this.weight);
    return new arNotice(this.gate, msg5 + this.hero.gainWits(this.weight));
  }

  trySeduce(): Screen {
    const exp = this.mob.baseExp();
    const msg =
      "\tYou waggle your eyebrows and make kissing noises towards " +
      this.mob.getName() +
      ".\n";
    if (Tools.contest(this.hero.seduceCharm(), this.mob.seduceCharm())) {
      const msg2 =
        msg +
        "\tIt smiles and slinks on over. " +
        Tools.select(QuestStrings.seduces) +
        "\n\tAfterwards, " +
        this.mob.getName() +
        " gives you a small token of " +
        "affection\n";
      this.mob.getPack().loseHalf();
      const msg3 = msg2 + Screen.packString("\nYou Recieve: ", this.mob.getPack());
      this.hero.getPack().merge(this.mob.getPack());
      this.hero.addStatus(Constants.FAME, this.weight);
      return new arNotice(
        this.gate,
        msg3 + this.hero.gainExp(exp) + this.hero.gainCharm(this.weight),
      );
    } else if (!this.mob.isPassive()) {
      return new arBattle(
        this,
        msg + "\tIt shrieks with fury at your shallow lies and attacks!\n",
      );
    } else {
      return new arNotice(
        this.getHome() as Screen,
        msg + "\tIt shrieks and runs away, giggling.\n",
      );
    }
  }

  tryFlee(): Screen {
    const exp = this.mob.baseExp() + idiv(this.mob.getWits(), 5);
    const tf = this.hero.thiefRank();
    if (this.mob.isPassive() || this.mob.isDefensive()) {
      this.hero.subFatigue(1);
      return new arNotice(
        this.getHome() as Screen,
        "\tYou run like the wind.  Fear lending flight to thy heels.\n" +
          "\tThe " +
          this.mob.getName() +
          " makes no effort to pursue.\n",
      );
    } else if (this.mob.isHostile()) {
      let msg =
        "\tYou run like the wind.  Fear lending flight to thy heels.\n" +
        "\tThe " +
        this.mob.getName() +
        " chases you for a while " +
        "just to make sure you aren't coming back\n";
      if (tf >= 2) {
        msg += this.thiefRun();
      }
      return new arNotice(this.getHome() as Screen, msg);
    } else {
      let hs = this.hero.runWits();
      if (this.mob.hasTrait(Constants.BANDIT)) {
        hs = idiv(hs, 2);
      }
      if (!Tools.contest(hs, this.mob.runWits())) {
        return new arBattle(
          this,
          "\tYou run like the wind.  Fear lending flight to thy heels.\n" +
            "\tBut the " +
            this.mob.getName() +
            " proves to be swifter!\n",
        );
      }
      let msg2 =
        "\tThe " +
        this.mob.getName() +
        " is left behind, panting. " +
        "Your fleet feet have just saved your skin.\n";
      if (tf >= 3) {
        msg2 += this.thiefRun();
      }
      return new arNotice(
        this.getHome() as Screen,
        msg2 + this.hero.gainExp(exp) + this.hero.gainWits(this.weight),
      );
    }
  }

  stareDown(): Screen {
    this.mob.magic(1);
    this.hero.magic(1);
    this.opt.redraw();
    const msg =
      "\tYou and the " +
      this.mob.getName() +
      " lock stares " +
      "in a ferocious contest of wills...";
    if (!Tools.contest(this.hero.getWits(), this.mob.getWits())) {
      return this.mobControls(msg + "You blink first!\n");
    }
    return this.heroControls(msg + "It blinks first!\n");
  }

  heroControls(msg: string): Screen {
    const exp = this.mob.baseExp() + this.mob.getWits();
    const msg2 =
      msg +
      "\tFirst you take all its treasures. Then you " +
      QuestStrings.controls[Tools.roll(QuestStrings.controls.length)] +
      "\n" +
      Screen.packString("\nYou Recieve: ", this.mob.getPack());
    Screen.getPack().merge(this.mob.getPack());
    return new arNotice(
      this.gate,
      msg2 + this.hero.gainExp(exp) + this.hero.gainWits(this.weight * 5),
    );
  }

  mobControls(msg: string | null): Screen {
    let text = msg ?? "";
    if (this.mob.isAggresive()) {
      return new arNotice(
        this.hero.killedScreen(this.getHome() as Screen, null, true),
        text +
          "\tOut of sheer maliciousness, the creature sends you on a long hike over a short cliff.\n",
      );
    }
    QuestStrings.controlled[0] = "convinces you that you are " + Tools.getBest() + ".";
    if (this.mob.isPassive()) {
      return new arNotice(
        this.getHome() as Screen,
        text +
          "\nThe " +
          this.mob.getName() +
          " expresses its anger when it " +
          Tools.select(QuestStrings.controlled as string[]) +
          "\n",
      );
    }
    this.hero.getPack().loseHalf();
    return new arNotice(
      this.getHome() as Screen,
      text +
        "\n\tFirst the " +
        this.mob.getName() +
        " takes half your gear, then it " +
        Tools.select(QuestStrings.controlled as string[]) +
        "\n",
    );
  }

  swapGoods(): Screen {
    this.mob.thief(1);
    this.hero.thief(1);
    this.opt.nextRound(this.hero, this.mob);
    return new arNotice(
      this,
      "\tYou and the " +
        this.mob.getName() +
        " start trading gear, " +
        "and before you know it... You are right back where " +
        "you started???\n",
    );
  }

  heroSwindles(): Screen {
    const exp = this.mob.baseExp() + this.mob.getCharm();
    if (this.mob.subPack(GearTypes.INSURANCE, 1) === 1) {
      const msg =
        "\tYou start 'trading' in earnest with the " +
        this.mob.getName() +
        ", rooting through its back pack as it nods " +
        "enthusiastically, when you find a magic coupon: " +
        "Thief Insurance.  Grumbling, you take the receipt " +
        "and walk away.\n";
      Screen.addPack(GearTypes.INSURANCE, 1);
      return new arNotice(this.getHome() as Screen, msg);
    }
    const msg2 =
      "\tYou lay out a complicated deal that the " +
      this.mob.getName() +
      " is unable to follow.  By the time you are finished, " +
      "it is paying you to take all its equipment.\n" +
      Screen.packString("\nYou Recieve: ", this.mob.getPack());
    Screen.getPack().merge(this.mob.getPack());
    return new arNotice(
      this.gate,
      msg2 + this.hero.gainExp(exp) + this.hero.gainCharm(this.weight * 5),
    );
  }

  mobSwindles(): Screen {
    if (this.hero.subPack(GearTypes.INSURANCE, 1) === 1) {
      return new arNotice(
        this.getHome() as Screen,
        "\tThe " +
          this.mob.getName() +
          " starts to tell you about this " +
          "terrific bridge for sale in Brook Land, then it " +
          "spies your Thief Insurance.  Grumbling, it snags " +
          "the coupon and makes an escape!\n",
      );
    } else if (this.mob.isAggresive()) {
      const msg =
        "\tThe " +
        this.mob.getName() +
        " starts to show you the " +
        "benefits of trading goods.  Pretty soon " +
        "you walk away completely satisfied with " +
        "an empty backpack.\n";
      this.hero.getPack().clrQueue();
      return new arNotice(this.getHome() as Screen, msg);
    } else if (this.mob.isPassive()) {
      const msg =
        "\tThe " +
        this.mob.getName() +
        " sells you a 'magic' rock " +
        "for " +
        this.hero.getMoney() +
        " marks, and leaves you a " +
        "satisfied customer.\n";
      this.hero.getPack().zero("Marks");
      Screen.addPack("Rock", 1);
      return new arNotice(this.getHome() as Screen, msg);
    } else {
      const cash = this.hero.getMoney();
      this.hero.getPack().loseHalf();
      this.hero.fixPack("Marks", idiv(cash, 2));
      return new arNotice(
        this.getHome() as Screen,
        "\tThe " +
          this.mob.getName() +
          " makes an irresistable sales pitch.  " +
          "It only costs you " +
          (cash - idiv(cash, 2)) +
          " marks for him to haul away " +
          "half your gear.\n",
      );
    }
  }

  mobFlees(): Screen;

  mobFlees(msg: string | null): Screen;

  mobFlees(msg?: string | null): Screen {
    const text = msg ?? "";
    const msg2 =
      text +
      "\tThe " +
      this.mob.getName() +
      " turns and makes tracks rapidly " +
      "away from you.\n";
    let ms = this.mob.runWits();
    if (this.hero.hasTrait(Constants.BANDIT)) {
      ms = idiv(ms, 2);
    }
    if (!Tools.contest(ms, this.hero.runWits())) {
      return new arBattle(this, msg2 + "\tBut you catch it before it escapes!\n");
    }
    return new arNotice(
      this.getHome() as Screen,
      msg2 + "\tIt manages to stay ahead of you long enough to escape...",
    );
  }

  thiefRun(): string {
    if (!Tools.contest(this.hero.getCharm(), this.mob.getCharm())) {
      return "";
    }
    this.hero.subFatigue(1);
    return (
      "\nYour 'merchant' training comes in handy. You duck into cover and the " +
      this.mob.getName() +
      " passes by.\n"
    );
  }

  tryToken(): Screen {
    const msg =
      "\tThe " +
      this.mob.getName() +
      " fixes you with an intent stare, " +
      "studying you to the core of your soul.  Finally, it " +
      "makes a decision.\n";
    if (Tools.contest(this.hero.getPower(), this.mob.getPower())) {
      const msg2 =
        msg +
        "\tBy some invisible procedure, the " +
        this.mob.getName() +
        " has judged you " +
        "worthy to recieve special training.  You are taken to a remote " +
        "location where you will learn the secrets of Ieatsu.\n" +
        this.hero.gainExp(2 * this.mob.baseExp()) +
        this.hero.gainGuts(2 * this.weight) +
        this.hero.gainWits(2 * this.weight) +
        this.hero.gainCharm(2 * this.weight);
      this.hero.addGuts(-3);
      this.hero.addWits(-3);
      this.hero.addCharm(-3);
      this.hero.addRank(Constants.IEATSU, 1);
      this.hero.addTemp(Constants.IEATSU, 1);
      this.hero.subFatigue(10);
      return new arNotice(new arNotice(this.getHome() as Screen, arQuest.trains), msg2);
    } else if (this.mob.isAggresive()) {
      return new arBattle(
        this,
        "\tIt launches itself into battle, determined to destroy you!\n",
      );
    } else {
      const msg3 =
        "\tThe " +
        this.mob.getName() +
        " slaps the token from your hand, then smashes it. " +
        "Apparently you have failed some unspoken test.\n";
      this.opt.remove(BUSHIDO);
      return new arNotice(this, msg3);
    }
  }

  tryCapture(): Screen {
    const msg =
      "\tYou scurry around the water, hopping over logs, rocks and roots.  The " +
      this.mob.getName() +
      "  spins away from you " +
      "squeeking in fear as it leaves behind a trail " +
      "of sparkling dust.\n";
    if (Tools.contest(Screen.getWits(), this.mob.getWits())) {
      const msg2 = msg + "\tYou Capture It!\n\n*** Bottled Faery found ***";
      Screen.addPack("Bottled Faery", 1);
      return new arNotice(
        this.getHome() as Screen,
        msg2 + this.hero.gainWits(10) + this.hero.gainExp(this.mob.baseExp()),
      );
    } else if (Tools.roll(3) >= this.mob.getStance()) {
      return new arNotice(
        this.getHome() as Screen,
        msg +
          "\tThe " +
          this.mob.getName() +
          " escapes over a small cliff and " +
          "quickly vanishes into some hedges.",
      );
    } else {
      return new arNotice(
        new arBattle(this, null),
        msg + "\tOkay! Now its mad!",
      );
    }
  }
}
