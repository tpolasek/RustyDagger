/**
 * arGuild - the DOM port of `DCourt.Screens.Areas.Forest.arGuild`
 * (Java: `The Free Adventurers Guild`).
 *
 * An `Indoors` screen with four paid training buttons (join, fight, magic,
 * thief).  Membership/rank bookkeeping is untouched; `getStatus().fixTrait`,
 * `addRank`/`addTemp`, `addWits`/`addCharm`/`addGuts` and `addFatigue` are the
 * same calls the Java made.
 *
 * Port note: the `Indoors` portraits are registered by the `Indoors`
 * constructor in this port, so `createTools()` only builds the training
 * buttons (matching the Java, which did not call `super.createTools()`).
 */

import { Tools } from "../../../Tools/Tools";
import { Constants } from "../../../Static/Constants";
import { Screen } from "../../../ui/screen";
import { Button } from "../../../ui/button";
import type { GameEvent } from "../../../ui/widget";
import type { HeroLike } from "../../../ui/session";
import { Indoors } from "../../Template/Indoors";
import { arNotice } from "../../Utility/arNotice";

/** Java `arGuild.text` (mutable, but only read). */
const text: string[] = ["Guild Member", "{5}Fighter Skill", "{5}Magery Skill", "{5}Trader Skill"];

/** Java `arGuild.someone` (index 0 is null; Java concatenated it as "null"). */
const someone: (string | null)[] = [
  null,
  "Silas Keep",
  "Sally Trader",
  "Bill Smith",
  "Aileen Suitor",
  "Elden Bishop",
  "Fenton Magus",
  "Gareth Shortlegs",
];

/** Java `arGuild.greeting`. */
const greeting: string[] = [
  "",
  "I am Fenton Magus",
  "Feel fear mortal",
  "Who violates these halls?",
  "Beware the Snot",
  "Elves are aloof",
  "Boar tastes like chicken",
  "Orcs are greedy",
  "Gryphons talk in riddles",
];

/** Java `arGuild.joinMsg` (the seen-identity is rolled once at class load). */
const joinMsg =
  "\tYou are ushered into luxurious chambers where the guild membership awaits you, dressed in black robes to maintain anonymity.  Incense wafts past and somewhere above a gong sounds.\n\tYou think you see " +
  String(someone[Tools.roll(someone.length)]) +
  " mingled in the crowd, but you can't be entirely sure.\n" +
  "\tA carpet is rolled back, revealing a blood soaked " +
  "pentagram!  A goat is brought forward!! You are handed " +
  "a condom!!!\n" +
  "\tThen they take your money and give you a guild pass. " +
  "While everyone gets drunk, you are sworn to secrecy. " +
  "You must never reveal the secret sacred rituals of the " +
  "Free Adventurers Guild.\n\t\t\t\t\tBottoms Up!!!\n";

/** Java `arGuild.fightMsg`. */
const fightMsg =
  "\tYou enter a rigorous regimen. Each morning you are beaten senseless by a dozen guild members. You are only fed meat and sugar. You must stand motionless beneath a waterfall for eight hours. You are dragged over rocks by wild horses. You must run uphill with buckets of water at arms length.\n\tOne morning you snap. In a berzerker rage, you beat your trainers bloody.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Combat Skill >>>\n\n*** You Have Grown Dumber  -2 Wits ***\n\n*** You Have Grown Sadder  -2 Charm ***\n";

/** Java `arGuild.magicMsg`. */
const magicMsg =
  " \tYou enter the guild library where you are inducted into the secrets of the mystic arts. \tThe truth is simple. You must bribe demons and faeries with gemstones. The hardest part of your training is memorizing the names and desires of these thousand and eight furtive spirits.\n\tEventually you manage to recite about a hundred of these names without summoning anything really powerful and vindictive.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Magery Skill >>>\n\n*** You Have Grown Weaker  -2 Guts ***\n\n*** You Have Grown Sadder  -2 Charm ***\n";

/** Java `arGuild.thiefMsg`. */
const thiefMsg =
  "\tYou are taken into a hidden alcove where five shifty members teach you the secrets of 'trading'.\n\tFirst you are taught the arts of subterfuge and misdirection. Second you learn about sleight of hand and concealment.  Third you are given detailed instruction regarding running and hiding. Fourth you are shown the value of attacking from the shadows. Finally you learn that suckers must never be given an even break.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Trading Skill >>>\n\n*** You Have Grown Weaker  -2 Guts ***\n\n*** You Have Grown Dumber  -2 Wits ***\n";

export class arGuild extends Indoors {
  private tools!: Button[];
  private cost!: number[];

  constructor(from: Screen | null) {
    super(
      from,
      "The Free Adventurers Guild" + (Screen.getQuests() < 5 ? " - Closed For Rituals" : ""),
    );
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Fenton.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? "I've met " + Tools.getBest() : msg;
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const h = Screen.getHero();
    super.localPaint();
    this.updateTools(h);
    if (h.hasTrait(Constants.GUILD)) {
      this.label("Guild Training", 210, 60);
      this.label("Fighter: " + h.fight() + "/" + h.fightRank(), 160, 80);
      this.label("Magery: " + h.magic() + "/" + h.magicRank(), 160, 100);
      this.label("Trader: " + h.thief() + "/" + h.thiefRank(), 280, 80);
      this.label("Total: " + h.guildRank() + "/" + h.getLevel(), 280, 100);
    }
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    const h = Screen.getHero();
    let next: Screen | null = null;
    if (Tools.movedAway(this)) return true;
    if (e.target === this.getPic(0)) next = this.getHome();

    for (let i = 0; i < this.tools.length; i++) {
      if (e.target !== this.tools[i]) continue;
      if (h.getMoney() >= this.cost[i]) {
        h.subMoney(this.cost[i]);
        if (i === 0) next = this.joinGuild(h);
        else if (i === 1) next = this.addFight(h);
        else if (i === 2) next = this.addMagic(h);
        else if (i === 3) next = this.addThief(h);
      }
      break;
    }
    Tools.setRegion(next);
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.tools = new Array<Button>(text.length);
    this.cost = new Array<number>(text.length).fill(0);
    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i] = new Button(text[i]);
      this.tools[i].reshape(170, 110 + i * 30, 200, 25);
      this.tools[i].setFont(Tools.statusF);
    }
    this.updateTools(Screen.getHero());
  }

  /** Java `addTools()`. */
  override addTools(): void {
    for (let i = 0; i < this.tools.length; i++) this.add(this.tools[i]);
  }

  /** Java `updateTools(itHero)`. */
  updateTools(h: HeroLike): void {
    let msg: string;
    const cash = h.getMoney();
    const guild = h.guildRank();
    const closed = h.getQuests() < 5;
    const member = h.hasTrait(Constants.GUILD);
    const avail = !closed && member && guild < h.getLevel();

    this.cost[0] = 4000;
    for (let i = 1; i < this.tools.length; i++) this.cost[i] = guild * 1000;
    if (h.hasTrait(Constants.ILLUMINATI)) {
      for (let i = 0; i < 4; i++) this.cost[i] = Math.trunc(this.cost[i] / 2);
    }

    for (let i = 0; i < this.tools.length; i++) {
      if (i === 0) msg = member ? text[i] : "{5}Join Guild $4000";
      else msg = text[i] + (guild === 0 ? " Free" : " $" + this.cost[i]);
      this.tools[i].setLabel(msg);
    }
    this.tools[0].enable(!closed && !member && cash >= this.cost[1]);
    for (let i = 1; i < this.tools.length; i++) {
      this.tools[i].enable(avail && cash >= this.cost[i]);
    }
  }

  /** Java `joinGuild(itHero)`. */
  joinGuild(h: HeroLike): Screen {
    h.getStatus().fixTrait(Constants.GUILD);
    h.addFatigue(5);
    return new arNotice(this, joinMsg);
  }

  /** Java `addFight(itHero)`. */
  addFight(h: HeroLike): Screen {
    h.addWits(-2);
    h.addCharm(-2);
    h.addRank(Constants.FIGHT, 1);
    h.addTemp(Constants.FIGHT, 1);
    h.addFatigue(5);
    return new arNotice(this, fightMsg);
  }

  /** Java `addMagic(itHero)`. */
  addMagic(h: HeroLike): Screen {
    h.addGuts(-2);
    h.addCharm(-2);
    h.addRank(Constants.MAGIC, 1);
    h.addTemp(Constants.MAGIC, 1);
    h.addFatigue(5);
    return new arNotice(this, magicMsg);
  }

  /** Java `addThief(itHero)`. */
  addThief(h: HeroLike): Screen {
    h.addGuts(-2);
    h.addWits(-2);
    h.addRank(Constants.THIEF, 1);
    h.addTemp(Constants.THIEF, 1);
    h.addFatigue(5);
    return new arNotice(this, thiefMsg);
  }
}
