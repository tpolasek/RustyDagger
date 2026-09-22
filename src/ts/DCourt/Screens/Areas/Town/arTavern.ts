/**
 * Port of `DCourt/Screens/Areas/Town/arTavern.java` - Silas Keeper's Bed &
 * Breakfast: buy a drink (rumours), sleep on the floor / rent a room / rent a
 * suite (PlaceTable exits) and paid storage.
 */

import { Screen } from "../../../ui/screen";
import { type GameEvent } from "../../../ui/widget";
import { Button } from "../../../ui/button";
import { Indoors } from "../../Template/Indoors";
import { arNotice } from "../../Utility/arNotice";
import { arStorage } from "../../Utility/arStorage";
import { Tools } from "../../../Tools/Tools";
import { Constants } from "../../../Static/Constants";
import { GameStrings } from "../../../Static/GameStrings";
import { Rumors } from "../../../Static/Rumors";

export class arTavern extends Indoors {
  private tools!: Button[];
  private readonly monger: string[] = [
    "One old woman tells you:",
    "A spirited forester tells you:",
    "An old drunken soldier tells you:",
    "Silas Keeper whispers to you:",
    "A beligerent fish monger prods you:",
    "A sly bard sing to you:",
    "Kara the barmaid sidles up to you:",
  ];

  /**
   * Java `arTavern.greeting`; index 0 is the fallback slot (Java's null entry,
   * see `arQueen.greeting`).
   */
  static readonly greeting: string[] = [
    "",
    "This job is great",
    "I love to drink",
    "You're my best friend",
    "I'm so happy",
    "Hixxup! Excuse me",
    "Burrrp - Ahhhhh",
    "*Sniff* *Sniff* <Gulp>",
    "Beer is my friend",
    "Huh? You say something?",
    "I'm kinda sleepy",
  ];
  /** Java `static int[] cost` - mutated by the constructor and `createTools`. */
  static readonly cost: number[] = [1, 5, 25, 100, 1];
  static readonly text: string[] = [
    "Buy a Drink",
    "Sleep on Floor",
    "Rent a Room",
    "Rent a Suite",
    "Storage",
  ];
  static readonly TAVERN_ID = 1;

  constructor(from: Screen | null) {
    super(from, "Silas Keepers Bed & Breakfast");
    if (Tools.getHero().hasTrait(Constants.HOTEL)) {
      for (let i = 1; i <= 4; i++) {
        arTavern.cost[i] = Math.trunc((arTavern.cost[i] + 9) / 10);
      }
    }
  }

  override getFace(): string {
    return "Faces/Silas.jpg";
  }

  override getGreeting(): string {
    const msg = Tools.select(arTavern.greeting);
    return msg.length === 0 ? `${Tools.getBest()} who?` : msg;
  }

  override localPaint(): void {
    super.localPaint();
    this.updateTools();
  }

  override action(e: GameEvent, o?: unknown): boolean {
    const hero = Screen.getHero();
    let next: Screen | null = null;
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.getPic(0)) {
      next = this.getHome();
    }
    for (let i = 0; i < this.tools.length; i++) {
      if (e.target !== this.tools[i]) {
        continue;
      }
      if (i < 4) {
        hero.subMoney(arTavern.cost[i]);
      }
      switch (i) {
        case 0:
          next = this.rumors();
          break;
        case 1:
          next = Screen.tryToExit(this, Constants.FLOOR, arTavern.cost[i]);
          break;
        case 2:
          next = Screen.tryToExit(this, Constants.ROOM, arTavern.cost[i]);
          break;
        case 3:
          next = Screen.tryToExit(this, Constants.SUITE, arTavern.cost[i]);
          break;
        case 4: {
          const spend = Number(hero.subMoney(arTavern.cost[i]));
          if (spend < arTavern.cost[i]) {
            hero.subStore("Marks", arTavern.cost[i] - spend);
          }
          next = new arStorage(this);
          break;
        }
      }
      break;
    }
    this.repaint();
    Tools.setRegion(next);
    return super.action(e, o);
  }

  override createTools(): void {
    const level = Number(Screen.getHero().getLevel());
    let i = arTavern.text.length;
    if (i > arTavern.cost.length) {
      i = arTavern.cost.length;
    }
    this.tools = new Array<Button>(i);
    arTavern.cost[1] = 4 + level;
    arTavern.cost[2] = 20 + 5 * level;
    arTavern.cost[3] = 75 + 25 * level;
    arTavern.cost[4] = level * 50;
    for (let i2 = 0; i2 < this.tools.length; i2++) {
      let msg = arTavern.text[i2];
      if (arTavern.cost[i2] > 0) {
        msg = `$${arTavern.cost[i2]} ${msg}`;
      }
      this.tools[i2] = new Button(msg);
      this.tools[i2].reshape(180, 55 + i2 * 30, 180, 25);
      this.tools[i2].setFont(Tools.statusF);
    }
    this.updateTools();
  }

  override addTools(): void {
    for (let i = 0; i < this.tools.length; i++) {
      this.add(this.tools[i]);
    }
  }

  updateTools(): void {
    /* Java built the buttons in the constructor; the port builds them on the
     * first `init()`, so a repaint before then has nothing to refresh. */
    if (!this.tools) {
      return;
    }
    const h = Screen.getHero();
    const cash = Number(h.getMoney());
    const store = Number(h.storeCount("Marks"));
    let i = 0;
    while (i < this.tools.length - 1) {
      this.tools[i].enable(cash >= arTavern.cost[i]);
      i++;
    }
    this.tools[i].enable(
      cash >= arTavern.cost[i] || store >= arTavern.cost[i] || cash + store > arTavern.cost[i],
    );
  }

  /** Java `arTavern.rumors()` - buy a drink in exchange for a rumour. */
  rumors(): Screen {
    const h = Screen.getHero();
    let msg: string;
    if (h.getQuests() < 1) {
      return new arNotice(
        this,
        GameStrings.GOSSIP +
          "\nYou are so tired that you nearly pass out trying to swallow your drink.\n",
      );
    }
    let val = Tools.roll(h.getCharm());
    if (h.getCharm() <= 10) {
      val += 2;
    } else if (h.getCharm() <= 20) {
      val++;
    }
    switch (val) {
      case 0:
        msg =
          GameStrings.GOSSIP +
          `\n\tSomeone slips you a mickey. You awake with a headache in the dark and stinking alley.\n\n*** You Have Missed One Quest ***\n\n*** ${h.getMoney()} Marks Lost ***\n`;
        h.subMoney(h.getMoney());
        h.addFatigue(1);
        break;
      case 1:
        msg =
          GameStrings.GOSSIP +
          "\n\tYou drink heavily and pass outfor a couple hours.\n\n*** You Have Missed One Quest ***\n";
        h.addFatigue(1);
        break;
      case 2:
      case 3:
      case 4:
        msg = GameStrings.GOSSIP + "\nNoone seems interested in you...\n";
        break;
      default:
        msg =
          `${GameStrings.GOSSIP}\n\t${Tools.select(this.monger)}\n` +
          `\n\t${Tools.select(Rumors.rumors)}\n${h.gainCharm(1)}`;
        break;
    }
    return new arNotice(this, msg);
  }
}
