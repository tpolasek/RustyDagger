/**
 * arEntry - the DOM port of `DCourt.Screens.Command.arEntry` (the login screen).
 *
 * Java wired this screen with the *new* AWT listener API - `actionPerformed` for
 * the Lists/Credits buttons, `mouseClicked` for the "Enter Here" portrait and
 * `keyPressed` for the two text fields - because `Canvas`/`TextField` cannot post
 * the old `Event(1001)`s.  In the DOM all of those become ordinary widget
 * dispatch, so they are handled in one `action()` override:
 *
 *   Lists   -> arRanking          Credits -> arNotice(creditText)
 *   portrait-> EnterGame()        typing  -> portrait shown while the name is >= 4 chars
 *
 * Text, layout and checks are Java's.  `EnterGame()` is a 1:1 port down to the
 * `heroAwakens()` wake-up sequence (stipend, disease, injury, exhaustion, gear
 * decay), and `scoreString()` keeps Java's character level padding of leading /
 * trailing spaces into '_'.
 *
 * One deliberate DOM affordance: pressing Enter in either field fires the same
 * `EnterGame()` the portrait click does (gated by the same `testNames()` check the
 * portrait's visibility uses).  Java's fields had no ActionListener, so Enter did
 * nothing there; a browser login form that ignores Enter is a usability trap.
 */

import { Constants } from "../../Static/Constants";
import { GameStrings } from "../../Static/GameStrings";
import { type itHero } from "../../Items/List/itHero";
import type { Player } from "../../Control/Player";
import { COLORS, color, fontAscent } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Portrait } from "../../ui/portrait";
import { Button } from "../../ui/button";
import { FTextField } from "../../ui/textField";
import type { GameEvent } from "../../ui/widget";
import { Tools, log } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";
import { arBuild } from "./arBuild";
import { arCreate } from "./arCreate";
import { arRanking } from "./arRanking";

export class arEntry extends Screen {
  /** Java `arEntry` header strings. */
  static readonly welcome = "Welcome To";
  static readonly guard = "Home of the Dragon Guard";
  static readonly copyright = "Copyright 1998 Fred's Friends, Inc.";
  static readonly homepage = "www.FFIends.com";
  static readonly dragon = "Dragon";
  static readonly court = "Court";

  /** Java `arEntry` camping gear ids. */
  static readonly CAMP_BAG = "Sleeping Bag";
  static readonly CAMP_COOK = "Cooking Gear";
  static readonly CAMP_TENT = "Camp Tent";

  /** Java `public static final String[] sick` (index 0 is null). */
  static readonly sick: (string | null)[] = [
    null,
    "You are deathly ill.",
    "You have a touch of plague.",
    "You are coughing and wheezing.",
    "You are sniffling and sneezing.",
    "You feel hungover.",
  ];

  /** Java `public static final String[] injure` (index 0 is null). */
  static readonly injure: (string | null)[] = [
    null,
    "Something bit off your arm last night.",
    "Your nicks and scratches fester horribly.",
    "You have a deep bruise where you lay on a rock.",
    "You have a painful crick in your back.",
    "Bedbugs have been gnawing on you.",
  ];

  /** Java `public static final String[] tired` (index 0 is null). */
  static readonly tired: (string | null)[] = [
    null,
    "You awake late in the afternoon.",
    "You've slept through lunch.",
    "Aw heck, it's nearly noon.",
    "You wake when the sun is two hands high.",
    "You awaken after breakfast.",
  ];

  /** Java `private static final String` wake-up snippets. */
  static readonly sniffle = "\tYou have tiny sniffle";
  static readonly warriorSniffle = " But warrior training dispels suffering.\n";
  static readonly cramp = "\tYou have a slight cramp.";
  static readonly warriorCramp = " But warrior training ignores pain.\n";
  static readonly sleepLate = "\tYou sleep a little late.";
  static readonly warriorRise = " But warrior training wakes you early.\n";
  static readonly gearRust = "\tSome of your gear has rusted.\n";
  static readonly gearRot = "\tSome camping gear has rotted.\n";
  static readonly stipendArrives = "\tThe annual stipend from your family lands has just arrived: +$";

  private nameTXF!: FTextField;
  private passTXF!: FTextField;
  private lists!: Button;
  private credits!: Button;
  /** Java `Image splash` - the title art, loaded in the constructor. */
  private splash: HTMLImageElement | null;

  constructor() {
    super("Title Screen");
    this.splash = null;
    this.setBackground(color(0, 128, 0));
    this.setForeground(COLORS.white);
    this.setFont(Tools.textF);
    this.hideStatusBar();
    this.splash = Tools.loadImage("Splash.jpg");
  }

  /** Java `localPaint(Graphics)`: title art, then the login form labels. */
  override localPaint(): void {
    // Java paints "Dragon"/"Court" first and then the splash over the whole
    // screen; the DOM keeps that order, so the art covers them exactly as before.
    this.label(arEntry.dragon, 80, 100, { font: Tools.giantF, color: color(255, 64, 0) });
    this.label(arEntry.court, 100, 180, { font: Tools.giantF, color: color(255, 64, 0) });
    if (this.splash !== null) {
      this.image("Splash.jpg", 0, 0, Tools.DEFAULT_WIDTH, Tools.DEFAULT_HEIGHT);
    }
    const val = 5 + fontAscent(Tools.textF);
    this.label(arEntry.copyright, 5, val, { font: Tools.textF, color: COLORS.white });
    this.alignRight(arEntry.homepage, Tools.DEFAULT_WIDTH - 5, val, {
      font: Tools.textF,
      color: COLORS.white,
    });
    const cyan = color(50, 200, 200);
    this.center(arEntry.welcome, Tools.DEFAULT_WIDTH / 2, 45, {
      font: Tools.statusF,
      color: cyan,
    });
    this.center(arEntry.guard, Tools.DEFAULT_WIDTH / 2, 205, {
      font: Tools.statusF,
      color: cyan,
    });
    const val2 = fontAscent(this.getFont());
    this.label("Hero Name", 25, 232 + val2);
    this.label("Password", 28, 262 + val2);
  }

  /** Java `actionPerformed(ActionEvent)` + `mouseClicked(MouseEvent)`. */
  override action(e: GameEvent, o?: unknown): boolean {
    if (this.movedAway()) {
      return true;
    }
    if (e.target === this.lists) {
      Tools.setRegion(new arRanking(this));
    }
    if (e.target === this.credits) {
      Tools.setRegion(new arNotice(this, GameStrings.creditText));
    }
    if (e.target === this.getPic(0)) {
      Tools.setRegion(this.enterGame());
    }
    return super.action(e, o);
  }

  /** Java `createTools()`. */
  override createTools(): void {
    const entryC = color(64, 128, 64);
    this.addPic(new Portrait("fldQuest.jpg", "Enter Here", 235, 215, 96, 64));
    this.getPic(0)?.setForeground(COLORS.white);
    this.getPic(0)?.show(false);

    this.nameTXF = new FTextField(15);
    this.nameTXF.setBackground(entryC);
    this.nameTXF.setForeground(COLORS.black);
    this.nameTXF.reshape(100, 230, 120, 22);
    // Java `addKeyListener`: every keystroke re-tests the name.
    this.nameTXF.onInput = () => this.refreshEnter();
    this.nameTXF.onEnter = () => this.enterOnReturn();

    this.passTXF = new FTextField(15);
    this.passTXF.setEchoCharacter("*");
    this.passTXF.setBackground(entryC);
    this.passTXF.setForeground(COLORS.black);
    this.passTXF.reshape(100, 260, 120, 22);
    this.passTXF.onInput = () => this.refreshEnter();
    this.passTXF.onEnter = () => this.enterOnReturn();

    this.lists = new Button("Lists");
    this.lists.reshape(340, 232, 55, 20);
    this.credits = new Button("Credits");
    this.credits.reshape(340, 262, 55, 20);
  }

  /** Java `addTools()`. */
  override addTools(): void {
    this.add(this.nameTXF);
    this.add(this.passTXF);
    this.add(this.lists);
    this.add(this.credits);
  }

  /** Java `keyPressed(KeyEvent)`: show the portrait while the name is long enough. */
  refreshEnter(): void {
    this.getPic(0)?.show(this.testNames());
  }

  /** The Enter-key affordance for the two fields (see the file header). */
  private enterOnReturn(): void {
    if (this.testNames()) {
      Tools.setRegion(this.enterGame());
    }
  }

  /** Java `testNames()`: the password check is commented out in Java as well. */
  testNames(): boolean {
    return this.nameTXF.getText().length >= 4;
    /* no password with local storage
    && this.passTXF.getText().length >= 4;
    */
  }

  /** Java `scoreString(String)`: pad the trimmed-away spaces with '_'. */
  scoreString(msg: string): string {
    let buf = "";
    const src = Tools.detokenize(msg);
    const len = src.length;
    const tlen = src.trim().length;
    let ix = 0;
    let c: number;
    // `c >= 0` was always true in Java's loop as well (the plan keeps it 1:1).
    while (ix < len && (c = src.charCodeAt(ix)) >= 0 && c <= 32) {
      buf += "_";
      ix++;
    }
    const tlen2 = tlen + ix;
    while (ix < tlen2) {
      buf += src.charAt(ix);
      ix++;
    }
    while (ix < len) {
      buf += "_";
      ix++;
    }
    return buf;
  }

  /** Java `EnterGame()`: log in, then pick the screen the hero wakes up on. */
  enterGame(): Screen {
    log("EnterGame");
    const name = this.scoreString(this.nameTXF.getText());
    const pass = this.scoreString(this.passTXF.getText());
    const player = Tools.getPlayer();
    if (!player.loadHero(name, pass)) {
      log("error loadHero EnterGame");
      return (player.errorScreen(this) as Screen | null) ?? this;
    }
    if (player.getHero() == null) {
      log("error getHero EnterGame");
      return new arCreate(player as Player);
    }
    if (player.isDead()) {
      log("Dead EnterGame");
      return new arNotice(this, GameStrings.heroHasDied);
    }
    const lot = Tools.getPlaceTable();
    if (lot === null) {
      // Java dereferenced the place table without a check (an NPE); the port
      // routes the missing table through the Player's error screen instead.
      log("error getPlaceTable EnterGame");
      return (player.errorScreen(this) as Screen | null) ?? this;
    }
    lot.select(player.getPlace());
    let next: Screen | null = lot.getLaunch();
    if (next === null) {
      next = this;
    }
    const next2 = this.heroAwakens(lot.getDecay(), String(lot.getUse()), String(lot.getAwake()), next);
    return player.needsBuild() ? new arBuild(next2) : next2;
  }

  /** Java `heroAwakens(int dcy, String use, String msg, Screen after)`. */
  heroAwakens(dcy: number, use: string, msg: string, after: Screen): Screen {
    const hero = Tools.getHero() as itHero;
    let result = msg;
    if (use.indexOf("b") >= 0 && hero.packCount(arEntry.CAMP_BAG) > 0) {
      dcy++;
    }
    if (use.indexOf("c") >= 0 && hero.packCount(arEntry.CAMP_COOK) > 0) {
      dcy++;
    }
    if (use.indexOf("t") >= 0 && hero.packCount(arEntry.CAMP_TENT) > 0) {
      dcy++;
    }
    if (hero.isNewday()) {
      if (use.indexOf("s") >= 0) {
        result = result.concat(this.heroStipend(hero));
      }
      result = result
        .concat(this.diseaseHero(hero, dcy))
        .concat(this.injureHero(hero, dcy))
        .concat(this.exhaustHero(hero, dcy))
        .concat(this.heroDecay(hero, dcy));
    }
    if (hero.getOverload() > 0) {
      result = result.concat("\n*** YOUR PACK IS OVERLOADED ***\n");
    }
    return new arNotice(after, result);
  }

  /** Java `diseaseHero(itHero, int)`. */
  diseaseHero(h: itHero, rate: number): string {
    let msg: string;
    if (Tools.roll(rate) > 0) {
      return "";
    }
    if (rate >= arEntry.sick.length) {
      msg = "".concat(arEntry.sniffle);
    } else {
      msg = "\t".concat(String(arEntry.sick[rate]));
    }
    if (h.fight() >= 1) {
      return msg.concat(arEntry.warriorSniffle);
    }
    h.ail(Math.trunc(h.getSkill() / rate));
    return msg.concat("\n");
  }

  /** Java `injureHero(itHero, int)`. */
  injureHero(h: itHero, rate: number): string {
    let msg: string;
    if (Tools.roll(rate) > 0) {
      return "";
    }
    if (rate >= arEntry.injure.length) {
      msg = "".concat(arEntry.cramp);
    } else {
      msg = "\t".concat(String(arEntry.injure[rate]));
    }
    if (h.fight() >= 2) {
      return msg.concat(arEntry.warriorCramp);
    }
    h.addWounds(Math.trunc(h.getGuts() / rate) - 1);
    return msg.concat("\n");
  }

  /** Java `exhaustHero(itHero, int)`. */
  exhaustHero(h: itHero, rate: number): string {
    let msg: string;
    if (Tools.roll(rate) > 0) {
      return "";
    }
    if (rate >= arEntry.tired.length) {
      msg = "".concat(arEntry.sleepLate);
    } else {
      msg = "\t".concat(String(arEntry.tired[rate]));
    }
    if (h.fight() >= 3) {
      return msg.concat(arEntry.warriorRise);
    }
    h.addFatigue(Math.trunc(h.getBaseQuests() / (rate + 1)) - 1);
    return msg.concat("\n");
  }

  /** Java `heroDecay(itHero, int)`: rust the gear, rot the camping gear. */
  heroDecay(h: itHero, rate: number): string {
    let decay = false;
    let msg = "";
    const rate2 = (rate + h.fight()) * 5;
    if (Screen.getGear().decay(rate2)) {
      decay = true;
    }
    if (Screen.getPack().decay(rate2)) {
      decay = true;
    }
    if (decay) {
      msg = msg.concat(arEntry.gearRust);
    }
    let decay2 = false;
    if (Tools.roll(rate2) === 0 && Screen.subPack(arEntry.CAMP_BAG, 1) === 1) {
      decay2 = true;
    }
    if (Tools.roll(rate2) === 0 && Screen.subPack(arEntry.CAMP_COOK, 1) === 1) {
      decay2 = true;
    }
    if (Tools.roll(rate2) === 0 && Screen.subPack(arEntry.CAMP_TENT, 1) === 1) {
      decay2 = true;
    }
    if (decay2) {
      msg = msg.concat(arEntry.gearRot);
    }
    return msg.length > 0 ? "\n".concat(msg) : msg;
  }

  /** Java `heroStipend(itHero)`: pay out the daily family stipend. */
  heroStipend(h: itHero): string {
    const num = h.getStatus().getCount(Constants.STIPEND);
    h.getStatus().zero(Constants.STIPEND);
    if (num < 1) {
      return "";
    }
    h.addMoney(num);
    return `${arEntry.stipendArrives}${num}\n`;
  }
}
