/**
 * arGoblin - the DOM port of `DCourt.Screens.Areas.Mound.arGoblin`
 * (Java: `Smidgeon Crumb at the Gobble Inn`).
 *
 * A `Shop` that doubles as an inn: an Inn/Shop radio switches between three
 * inn services (sleep, drink+rumors, rent a cot) and the goblin shop stock.
 * The gossip table, missed-quest/fatigue effects, charm gain and all messages
 * are kept as in Java.
 *
 * Port note: the Java `action` tool loop would spin forever if a matching
 * target were clicked with too little money (the buttons are disabled in that
 * state, so Java never hit it); the port uses a bounded loop with the same
 * observable behaviour.  The Inn radio is held in `barBox` because the base
 * `Screen` class already owns a `bar()` chrome method.
 */

import { Tools } from "../../../Tools/Tools";
import { Constants } from "../../../Static/Constants";
import { GRumors } from "../../../Static/GRumors";
import { GameStrings } from "../../../Static/GameStrings";
import { GearTypes } from "../../../Static/GearTypes";
import { Screen } from "../../../ui/screen";
import { Button } from "../../../ui/button";
import { Checkbox, CheckboxGroup } from "../../../ui/checkbox";
import type { GameEvent } from "../../../ui/widget";
import { Shop } from "../../Template/Shop";
import { arNotice } from "../../Utility/arNotice";
import { Item } from "../../../Items/Item";
import { itArms } from "../../../Items/List/itArms";

/** Java `arGoblin.greeting`. */
const greeting: string[] = [
  "",
  "Sorry, I sneezded on it",
  "Zat's funny! tee-hee-hee!",
  "Need some shirtzez?",
  "I can loanzez money...",
  "You need zomething?",
  "I price thingzez nice",
  "Insuranze for your woezez?",
  "Whatz your problemzez?",
];

/** Java `arGoblin.cost` (static; index 2 is recomputed per construction). */
const cost: number[] = [0, 10, 250];

/** Java `arGoblin.text`. */
const text: string[] = ["Sleep on Floor", "Buy a Drink", "Rent Smelly Cot"];

/** Java `arGoblin.stock`. */
const stock: string[] = [
  "Gobble Inn Postcard",
  "Gobble Inn T-Shirt",
  "Identify Scroll",
  GearTypes.SALVE,
  GearTypes.SELTZER,
  "Map to Warrens",
  GearTypes.INSURANCE,
  "Map to Treasury",
];

/** Java `arGoblin.monger`. */
const monger: string[] = [
  "An old goblin witch tells you:",
  "A frothing berzerker screams:",
  "A sly pickpocket sidles up to you:",
  "Smidgeon Crumb grunts at you:",
  "A beligerent worm herder prods you:",
  "A goblin mage deigns to inform you:",
  "Slouch the barmaid mumbles to you:",
];

export class arGoblin extends Shop {
  private tools: Button[] = [];
  private transact!: Button;
  private bar_shop!: CheckboxGroup;
  /** Named `barBox`: the base `Screen` already has a `bar()` chrome method. */
  private barBox!: Checkbox;
  private shop!: Checkbox;

  constructor(from: Screen | null) {
    super(from, "Smidgeon Crumb at the Gobble Inn");
    cost[2] = 75 + 25 * Screen.getHero().getLevel();
    if (Screen.hasTrait(Constants.HOTEL)) cost[2] = Math.trunc(cost[2] / 10);
  }

  /** Java `getFace()`. */
  override getFace(): string {
    return "Faces/Smidgeon.jpg";
  }

  /** Java `getGreeting()`. */
  override getGreeting(): string {
    const msg = Tools.select(greeting);
    return msg.length === 0 ? Tools.getBest() + " aint nuzzin" : msg;
  }

  /** Java `getStockList()`. */
  override getStockList(): string[] {
    return stock;
  }

  /** Java `doSpecial()`. */
  override doSpecial(): void {}

  /** Java `getSpecial()`. */
  override getSpecial(): string | null {
    return null;
  }

  /** Java `costSpecial()`. */
  override costSpecial(): number {
    return 0;
  }

  /** Java `discardStock(Item)`. */
  override discardStock(_it: Item): boolean {
    return false;
  }

  /** Java `discardPack(Item)`. */
  override discardPack(it: Item): boolean {
    return it instanceof itArms;
  }

  /** Java `createTools()`. */
  override createTools(): void {
    super.createTools();
    this.getTable().reshape(160, 80, 230, 175);
    let count = text.length;
    if (count > cost.length) count = cost.length;
    this.tools = new Array<Button>(count);
    for (let i = 0; i < this.tools.length; i++) {
      let msg = text[i];
      if (cost[i] > 0) msg += " $" + cost[i];
      this.tools[i] = new Button(msg);
      this.tools[i].reshape(180, 75 + i * 30, 200, 25);
      this.tools[i].setFont(Tools.statusF);
    }
    this.transact = new Button("Buy");
    this.transact.reshape(200, 50, 100, 20);
    this.transact.setFont(Tools.statusF);
    this.bar_shop = new CheckboxGroup();
    this.barBox = new Checkbox("Inn", this.bar_shop, true);
    this.barBox.reshape(5, 240, 45, 20);
    this.barBox.setFont(Tools.statusF);
    this.barBox.setBackground(this.getBackground());
    this.shop = new Checkbox("Shop", this.bar_shop, false);
    this.shop.reshape(50, 240, 65, 20);
    this.shop.setFont(Tools.statusF);
    this.shop.setBackground(this.getBackground());
    this.updateTools();
  }

  /** Java `addTools()`. */
  override addTools(): void {
    super.addTools();
    for (let i = 0; i < this.tools.length; i++) this.add(this.tools[i]);
    this.add(this.transact);
    this.add(this.barBox);
    this.add(this.shop);
  }

  /** Java `updateTools()`. */
  override updateTools(): void {
    const inBar = this.bar_shop.getCurrent() === this.barBox;
    const cash = Screen.getHero().getMoney();
    super.updateTools();
    this.hideTools(inBar ? 2 : 1);
    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i].enable(cash >= cost[i]);
      this.tools[i].show(inBar);
    }
    const it = this.shopFind();
    if (it === null) {
      this.transact.setLabel("Buy");
      this.transact.enable(false);
    } else {
      const price = this.stockValue(it);
      this.transact.setLabel("Buy $" + price);
      this.transact.enable(cash >= price);
    }
    this.transact.show(!inBar);
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (Tools.movedAway(this)) return true;
    if (e.target === this.transact) {
      this.buyItem(1);
    } else if (e.target === this.getPic(0)) {
      Tools.setRegion(this.getHome());
    } else {
      for (let ix = 0; ix < this.tools.length; ix++) {
        if (e.target !== this.tools[ix]) continue;
        if (Screen.getMoney() >= cost[ix]) {
          Screen.subMoney(cost[ix]);
          if (ix === 0) Tools.setRegion(Screen.tryToExit(this, Constants.MOUND, cost[ix]));
          else if (ix === 1) Tools.setRegion(this.rumors());
          else if (ix === 2) Tools.setRegion(Screen.tryToExit(this, Constants.COT, cost[ix]));
        }
        break;
      }
    }
    return super.action(e, o);
  }

  /** Java `rumors()`. */
  rumors(): Screen {
    let msg: string;
    if (Screen.getQuests() < 1) {
      return new arNotice(
        this,
        GameStrings.GOSSIP +
          "\nYou are so tired that you nearly pass out trying to swallow your drink.\n",
      );
    }
    switch (Tools.roll(Screen.getCharm())) {
      case 0:
        msg =
          GameStrings.GOSSIP +
          "\n\tSomeone slips you a mickey. You awake with a headache in the dark and stinking alley.\n\n*** You Have Missed One Quest ***\n\n*** Your Backpack is Empty! ***\n";
        Screen.getPack().clrQueue();
        Screen.addFatigue(1);
        break;
      case 1:
      case 2:
        msg =
          GameStrings.GOSSIP +
          "\n\tYou drink heavily and pass outfor a couple hours.\n\n*** You Have Missed One Quest ***\n";
        Screen.addFatigue(1);
        break;
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        msg = GameStrings.GOSSIP + "\tNoone seems interested in you...\n";
        break;
      default:
        msg =
          GameStrings.GOSSIP +
          "\n\t" +
          Tools.select(monger) +
          "\n" +
          "\n\t" +
          Tools.select(GRumors.grumors) +
          "\n" +
          Screen.getHero().gainCharm(2);
        break;
    }
    return new arNotice(this, msg);
  }
}
