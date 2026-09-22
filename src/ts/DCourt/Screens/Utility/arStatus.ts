/**
 * arStatus - the DOM port of `DCourt.Screens.Utility.arStatus` (the hero
 * status/inventory screen behind the status strip's portrait).
 *
 * This is the pack/gear screen: the left half is an `FTextList` of the hero's
 * pack, the right half are the five worn armour slots (with hover highlighting),
 * and the six buttons below run `Use / Info / Peer / Dump Slot / Oops / Exit`.
 * Every gear mutation - wearing, removing, dumping, scrolling, the twelve
 * `GearTable` effects - is ported from the Java bodies unchanged.
 *
 * DOM notes:
 *  - Java's `Button[] action` field is `actionBtns` here: TS keeps methods and
 *    fields in one namespace and `action()` is the event handler;
 *  - Java's `mouseMove(Event, int, int)` needed AWT's event mask; the DOM listens
 *    for `mousemove` on the screen root (the gear text is painted into the
 *    non-interactive paint layer, so those coordinates reach the screen);
 *  - `Screen.mouseDown` is overridden exactly as in Java: clicks outside the
 *    armour rectangle are not consumed by this screen;
 *  - the `over`/`pick` comparisons stay reference comparisons (`findGearTrait`
 *    hands back the live gear item), and integer division is `Math.trunc`.
 */

import { GearTable } from "../../Control/GearTable";
import { Item } from "../../Items/Item";
import { itAgent } from "../../Items/List/itAgent";
import { itArms } from "../../Items/List/itArms";
import { itHero } from "../../Items/List/itHero";
import { itList } from "../../Items/itList";
import { itNote } from "../../Items/List/itNote";
import * as ArmsTrait from "../../Static/ArmsTrait";
import * as GearTypes from "../../Static/GearTypes";
import { COLORS, color, inside, rect, type ColorSpec, type RectLike } from "../../ui/dom";
import { coordsIn } from "../../ui/stage";
import { Screen } from "../../ui/screen";
import { Button } from "../../ui/button";
import { FTextList } from "../../ui/textList";
import type { GameEvent } from "../../ui/widget";
import { Tools } from "../../Tools/Tools";
import { arDetail } from "./arDetail";
import { arNotice } from "./arNotice";
import { arPeer } from "./arPeer";
import { arScribe } from "./arScribe";

/** Java `arStatus` state machine. */
const STATE_WAIT = 0;
const STATE_TARGET = 1;

/** Java `arStatus.actionSTR`. */
const actionSTR: string[] = ["Use", "Info", "Peer", "Dump Slot", "Oops", "Exit"];

/** Java `arStatus.slot`. */
const slot: string[] = [
  ArmsTrait.HEAD,
  ArmsTrait.BODY,
  ArmsTrait.FEET,
  ArmsTrait.RIGHT,
  ArmsTrait.LEFT,
];

/** Java `arStatus.loc`. */
const loc: string[] = ["H:", "B:", "F:", "R:", "L:"];

/** Java `arStatus.gearRect`. */
const gearRect: RectLike = rect(200, 145, 200, 100);

/** Java `arStatus.expRect`. */
const expRect: RectLike = rect(175, 98, 90, 10);

/** Java `arStatus.gclr`: normal / picked / hovered gear colours. */
const gclr: ColorSpec[] = [COLORS.white, COLORS.cyan, COLORS.lightGray, color(96, 192, 192)];

export class arStatus extends Screen {
  private useItem: Item | null = null;
  private pick: Item | null = null;
  private over: itArms | null = null;
  private state = STATE_WAIT;
  private effect = 0;
  private fight = false;
  private attack = false;
  private table!: FTextList;
  /** Java `Button[] action` (renamed: `action()` is the handler in TS). */
  private actionBtns!: Button[];

  /** Java `arStatus(Screen from)` / `arStatus(Screen from, boolean battle)`. */
  constructor(from: Screen | null, battle = false) {
    super(from, "Hero Status Screen");
    this.fight = battle;
    this.attack = this.fight && !Tools.getHero().hasTrait("Panic");
    this.hideStatusBar();
    this.setBackground(color(192, 64, 0));
    this.setForeground(COLORS.white);
    this.setFont(Tools.statusF);
    Screen.getHero().calcCombat();
  }

  /** Java `getDump()`: the hero's dump slot list. */
  getDump(): itList {
    return Screen.getHero().getDump() as itList;
  }

  /** Java `init()`. */
  override init(): void {
    super.init();
    this.updateTools();
    this.fixTable();
  }

  /** Java `createTools()`. */
  override createTools(): void {
    this.addPic(Screen.getHero().getPortrait());
    this.getPic(0)?.reshape(275, 5, 120, 120);

    this.actionBtns = new Array<Button>(6);
    for (let ix = 0; ix < 6; ix++) {
      const off = ix % 3 === 0 ? 20 : 0;
      this.actionBtns[ix] = new Button(actionSTR[ix]!);
      this.actionBtns[ix]!.setFont(Tools.textF);
      this.actionBtns[ix]!.reshape(205 + (ix % 3) * 65 - off, ix < 3 ? 250 : 275, 60 + off, 20);
      this.actionBtns[ix]!.setForeground(COLORS.black);
    }

    this.table = new FTextList();
    this.table.reshape(5, 140, 170, 140);
    this.table.setFont(Tools.textF);
    this.table.setForeground(COLORS.black);

    // Java's `mouseMove` (the AWT event mask) becomes a root listener; the gear
    // text lives in the paint layer, which never receives pointer events.
    this.root.addEventListener("mousemove", (ev) => {
      const pt = coordsIn(ev as MouseEvent, this.root);
      this.mouseMove(pt.x, pt.y);
    });

    this.updateTools();
  }

  /** Java `addTools()`. */
  override addTools(): void {
    for (let i = 0; i < 6; i++) {
      this.add(this.actionBtns[i]!);
    }
    this.add(this.table);
  }

  /** Java `updateTools()`: the Use button label and the enabled state of Oops. */
  updateTools(): void {
    const h = Tools.getHero() as itHero;
    this.actionBtns[0]!.setLabel(this.useString() + (this.fight ? ` (${h.actions()})` : ""));
    this.actionBtns[4]!.enable(!this.getDump().isEmpty());
    h.picture();
  }

  /** Java `useString()`. */
  useString(): string {
    return this.state === STATE_WAIT || this.useItem === null
      ? "Use"
      : GearTable.effectLabel(this.useItem);
  }

  /** Java `fixTable()`: rebuild the pack list from the hero's pack. */
  fixTable(): void {
    const items = Screen.getPack().elements() as Item[];
    let choice = -1;
    this.table.clear();
    for (let ix = 0; ix < items.length; ix++) {
      const it = items[ix]!;
      this.table.addItem(this.nameItem(it));
      if (it === this.pick) {
        choice = ix;
      }
    }
    this.table.setSelect(choice);
  }

  /** Java `findPack(itList)` (unused in the Java source as well). */
  findPack(p: itList): Item | null {
    const items = p.elements();
    let which = this.table.getSelect();
    if (which < 0) {
      return null;
    }
    for (const it of items) {
      which--;
      if (which < 0) {
        return it;
      }
    }
    return null;
  }

  /** Java `nameItem(Item)`: mage-usable gear also shows its effect label. */
  nameItem(it: Item): string {
    return !GearTable.canMageUse(it) ? it.toShow() : `${it.toShow()}{${GearTable.effectLabel(it)}}`;
  }

  /** Java `insertPack(Item)`. */
  insertPack(it: Item): void {
    Screen.putPack(it);
    this.table.addItem(this.nameItem(it), 0);
  }

  /** Java `removePack(Item)`. */
  removePack(it: Item): boolean {
    const ix = Screen.getPack().indexOf(it) as number;
    if (ix < 0) {
      return false;
    }
    this.table.delItem(ix);
    Screen.subPack(it);
    this.table.setSelect(-1);
    return true;
  }

  /**
   * Java `updatePack(Item)`.  Renamed: Java overloaded `Screen.updatePack()` with
   * a parameter, which TS cannot express two members deep.
   */
  updatePackItem(it: Item): void {
    const ix = Screen.getPack().indexOf(it) as number;
    if (ix >= 0) {
      this.table.setItem(this.nameItem(it), ix);
      this.table.setSelect(ix);
      this.pick = it;
    }
  }

  /** Java `localPaint(Graphics)`. */
  override localPaint(): void {
    const b = this.bounds();
    this.fill(0, 0, b.width, b.height, this.getBackground());
    this.drawStats();
    this.drawGear(180, 140);
  }

  /**
   * Java `drawStats(Graphics)`.
   *
   * `pen` follows Java's `Graphics` colour state: the text starts in the
   * foreground (white), the exp bar repaints it white/blue and leaves it BLACK,
   * and the "Load:" line therefore comes out black unless the pack is overloaded
   * (which sets cyan).
   */
  drawStats(): void {
    const h = Screen.getHero() as itHero;
    const wounds = h.getWounds();
    const fatigue = h.getFatigue() + h.getOverload();
    const disease = h.disease();
    let pen = this.getForeground();
    this.label(String(h.getTitle()) + String(h.getName()), 5, 18, { font: Tools.statusF, color: pen });
    this.label(
      `Level: ${h.getLevel()}   Rank: ${h.getRankTitle()}   Age: ${h.getAge()}`,
      5,
      36,
      { font: Tools.statusF, color: pen },
    );
    this.label(`Guts: ${h.getGuts()}${wounds > 0 ? `[-${wounds}]` : ""}`, 5, 54, {
      font: Tools.statusF,
      color: pen,
    });
    this.label("Wits: " + h.getWits(), 5, 72, { font: Tools.statusF, color: pen });
    this.label("Charm: " + h.getCharm(), 5, 90, { font: Tools.statusF, color: pen });
    this.label(`Quests: ${h.getBaseQuests()}${fatigue > 0 ? `[-${fatigue}]` : ""}`, 5, 108, {
      font: Tools.statusF,
      color: pen,
    });
    this.label("Attack: " + h.getAttack(), 140, 54, { font: Tools.statusF, color: pen });
    this.label("Defend: " + h.getDefend(), 140, 72, { font: Tools.statusF, color: pen });
    this.label(`Skill: ${h.getSkill()}${disease > 0 ? `[-${disease}]sick` : ""}`, 140, 90, {
      font: Tools.statusF,
      color: pen,
    });
    this.label("Exp:", 140, 108, { font: Tools.statusF, color: pen });

    // The experience bar (Java filled it with the ratio exp / raise, then left
    // the pen black for the two lines below).
    const r = expRect;
    const raise = h.getRaise();
    this.fill(r.x, r.y, r.width, r.height, COLORS.white);
    this.fill(
      r.x,
      r.y,
      raise > 0 ? Math.trunc((r.width * h.getExp()) / raise) : 0,
      r.height,
      COLORS.blue,
    );
    this.outline(r.x, r.y, r.width, r.height, COLORS.black);
    pen = COLORS.black;

    if (this.fight) {
      this.label(this.actionLine(h), 5, 130, { font: Tools.courtF, color: pen });
    } else {
      this.label(this.guildLine(h), 5, 130, { font: Tools.statusF, color: pen });
    }

    let msg = `Load: ${Screen.getPack().getCount()} (${h.packMax()})`;
    if (h.getOverload() > 0) {
      msg = "OVER ".concat(msg);
      pen = COLORS.cyan;
    }
    this.label(msg, 5, 295, { font: Tools.boldF, color: pen });
  }

  /** Java `drawGear(Graphics, int, int)`: the five armour slots. */
  drawGear(dx: number, dy: number): void {
    this.label("Armament", dx + 70, dy, { font: Tools.statusF, color: COLORS.black });
    for (let ix = 0; ix < 5; ix++) {
      const it = Screen.findGearTrait(slot[ix]!) as Item | null;
      const col = gclr[it === null ? 0 : (it === this.pick ? 1 : 0) + (it === this.over ? 2 : 0)]!;
      dy += 20;
      this.label(loc[ix]! + (it === null ? "" : String(it.toShow())), dx, dy, {
        font: Tools.statusF,
        color: col,
      });
    }
  }

  /** Java `actionLine(itAgent)`: the queued combat actions. */
  actionLine(h: itAgent): string {
    let msg = "";
    for (const it of h.getActions().elements()) {
      msg = msg.concat(" ".concat(String(it.toShow())));
    }
    return msg.length < 1 ? msg : "Use: ".concat(msg);
  }

  /** Java `guildLine(itAgent)`: the guild ranks, empty for non-members. */
  guildLine(h: itAgent): string {
    let msg = "Guild = ";
    if (h.guildRank() < 1) {
      return "";
    }
    const num = h.fightRank();
    if (num > 0) {
      msg = msg.concat(`F:${h.fight()}/${num}  `);
    }
    const num2 = h.magicRank();
    if (num2 > 0) {
      msg = msg.concat(`M:${h.magic()}/${num2}  `);
    }
    const num3 = h.thiefRank();
    if (num3 > 0) {
      msg = msg.concat(`T:${h.thief()}/${num3}  `);
    }
    const num4 = h.ieatsuRank();
    if (num4 > 0) {
      msg = msg.concat(`S:${h.ieatsu()}/${num4}  `);
    }
    return msg;
  }

  /** Java `mouseMove(Event, int, int)`: hover highlighting in the armour box. */
  mouseMove(x: number, y: number): boolean {
    const what = !inside(gearRect, x, y)
      ? null
      : (Screen.findGearTrait(slot[Math.trunc((y - gearRect.y) / 20)]!) as Item | null);
    if (what === this.over) {
      return false;
    }
    this.over = what as itArms | null;
    this.repaint();
    return false;
  }

  /** Java `mouseDown(Event, int, int)`: click the armour box to pick an item. */
  override mouseDown(_e: GameEvent, x: number, y: number): boolean {
    if (!inside(gearRect, x, y)) {
      return false;
    }
    if (this.table.getSelect() >= 0) {
      this.table.setSelect(-1);
      this.pick = null;
    }
    const what = Screen.findGearTrait(slot[Math.trunc((y - gearRect.y) / 20)]!) as Item | null;
    if (!(what instanceof itArms)) {
      return false;
    }
    this.over = what;
    if (this.over === this.pick) {
      this.pick = null;
    } else {
      this.pick = this.over;
    }
    this.repaint();
    return true;
  }

  /** Java `action(Event, Object)`. */
  override action(e: GameEvent, _o?: unknown): boolean {
    if (Tools.movedAway(this)) {
      return true;
    }
    if (e.target === this.table) {
      this.pick = Screen.selectPack(this.table.getSelect()) as Item | null;
    } else if (e.target === this.actionBtns[0]) {
      this.usePick();
    } else if (e.target === this.actionBtns[1]) {
      this.detailItem(this.pick);
    } else if (e.target === this.actionBtns[2]) {
      this.peerHero();
    } else if (e.target === this.actionBtns[3]) {
      this.dumpItem();
    } else if (e.target === this.actionBtns[4]) {
      this.backDump();
    } else if (e.target === this.actionBtns[5] || e.target === this.getPic(0)) {
      Tools.setRegion(this.getHome());
    }
    this.updateTools();
    this.repaint();
    return true;
  }

  /** Java `detailItem(Item)`. */
  detailItem(what: Item | null): void {
    if (what !== null) {
      Tools.setRegion(new arDetail(this, what));
    }
  }

  /** Java `peerHero()`. */
  peerHero(): void {
    Tools.setRegion(new arPeer(this, 2, String(Screen.getHero().getName())));
  }

  /** Java `usePick()`. */
  usePick(): void {
    const h = Tools.getHero();
    const pick = this.pick;
    // Java's guards: no actions left in a fight, and only known gear is usable
    // (`GearTable.find(null)` is false, so an empty selection returns here too).
    if (pick === null || (this.fight && h.actCount() < 1) || !GearTable.find(pick)) {
      return;
    }
    if (this.state === STATE_TARGET) {
      if (pick instanceof itArms) {
        if (this.useItem !== null) {
          this.performEffect(this.useItem);
        }
      }
      this.setStateWait();
    } else if (this.state !== STATE_WAIT) {
      // Java: empty branch (any other state does nothing).
    } else {
      if (pick instanceof itArms) {
        this.enactGear();
      } else if (GearTable.isScroll(pick)) {
        this.setStateTarget();
      } else if (GearTable.canHeroUse(pick)) {
        this.useItem = pick;
        this.performEffect(pick);
      }
    }
  }

  /** Java `dumpItem()`: move an item (pack or worn, uncursed) into the dump slot. */
  dumpItem(): void {
    const pick = this.pick;
    if (pick === null) {
      return;
    }
    if (this.table.getSelect() >= 0) {
      const old = this.table.getSelect();
      if (this.removePack(pick)) {
        this.getDump().insert(pick);
        this.table.setSelect(old);
        this.pick = Screen.selectPack(this.table.getSelect()) as Item | null;
      }
    } else if (
      Screen.getGear().indexOf(pick) >= 0 &&
      pick instanceof itArms &&
      !pick.hasTrait(ArmsTrait.CURSE) &&
      Screen.getGear().drop(pick) !== null
    ) {
      this.getDump().insert(pick);
      this.pick = null;
    }
  }

  /** Java `backDump()`: take the first dumped item back into the pack. */
  backDump(): void {
    const it = this.getDump().select(0);
    if (it !== null) {
      this.getDump().drop(it);
      this.insertPack(it);
    }
  }

  /** Java `enactGear()`. */
  enactGear(): void {
    const pick = this.pick;
    if (pick === null) {
      return;
    }
    if (Screen.getPack().indexOf(pick) >= 0) {
      this.wearGear();
    } else if (Screen.getGear().indexOf(pick) >= 0) {
      this.removeGear(pick as itArms);
    }
    if (this.fight) {
      Screen.getHero().useAction();
    }
    Screen.getHero().calcCombat();
  }

  /** Java `wearGear()`: swap out whatever occupies the item's slots. */
  wearGear(): void {
    const what = this.pick as itArms;
    let slots = 0;
    for (let ix = 0; ix < 5; ix++) {
      if (what.hasTrait(slot[ix]!)) {
        if (this.removeGear(Screen.getGear().findArms(slot[ix]!) as itArms | null)) {
          slots++;
        } else {
          return;
        }
      }
    }
    if (slots >= 1) {
      what.revealCurse();
      this.removePack(what);
      const gear = Screen.getGear();
      this.pick = what;
      gear.append(what);
    }
  }

  /** Java `removeGear(itArms)`: cursed gear refuses to come off. */
  removeGear(what: itArms | null): boolean {
    if (what === null) {
      return true;
    }
    if (what.isCursed()) {
      Tools.setRegion(
        new arNotice(
          this,
          `\tYou can't remove the ${what.getName()}!  The @&$#~ thing is Cursed %#$@!\n`,
        ),
      );
      return false;
    }
    Screen.getGear().drop(what);
    this.insertPack(what);
    return true;
  }

  /** Java `setStateWait()`. */
  setStateWait(): void {
    if (this.state !== STATE_WAIT) {
      this.state = STATE_WAIT;
      this.useItem = null;
      this.effect = 0;
    }
  }

  /** Java `setStateTarget()`: a scroll waits for the item it will be cast on. */
  setStateTarget(): void {
    if (this.state !== STATE_TARGET) {
      this.state = STATE_TARGET;
      this.useItem = this.pick;
      this.effect = this.pick === null ? 0 : GearTable.getEffect(this.pick);
      this.pick = null;
    }
  }

  /** Java `performEffect(Item)`: consume the item and run its effect. */
  performEffect(source: Item): void {
    if (this.tryEffect(source)) {
      const h = Screen.getHero();
      this.attack = this.fight && !h.hasTrait("Panic");
      if (this.fight) {
        h.act();
      }
      const used = this.useItem;
      if (used === null) {
        return;
      }
      if (used.getCount() === 1) {
        this.removePack(used);
        this.pick = null;
      } else {
        Screen.subPack(used.getName(), 1);
        this.updatePackItem(used);
      }
      this.repaint();
    }
  }

  /** Java `tryEffect(Item)`. */
  tryEffect(source: Item): boolean {
    switch (GearTable.getEffect(source)) {
      case 1:
        this.effectIdentify(this.pick as itArms);
        return true;
      case 2:
        Screen.getHero().doHeal();
        return true;
      case 3:
        Screen.getHero().doCure();
        return true;
      case 4:
        Screen.getHero().doBlind();
        return true;
      case 5:
        Screen.getHero().doPanic();
        return true;
      case 6:
        Screen.getHero().doBlast();
        return true;
      case 7:
        Screen.getHero().doRevive();
        return true;
      case 8:
        Screen.getHero().doHaste();
        return true;
      case 9:
        Screen.getHero().doRefresh();
        return true;
      case 10:
        Screen.getHero().doCookie();
        return true;
      case 11:
        Screen.getHero().doYouth();
        return true;
      case GearTypes.EFF_AGING:
        Screen.getHero().doAging();
        return true;
      case GearTypes.EFF_FACELESS:
        this.effectFaceless();
        return true;
      case GearTypes.EFF_SCRIBE:
        this.effectScribe(this.pick as Item);
        return true;
      case GearTypes.EFF_GLOW:
        this.effectGlow(this.pick as itArms);
        return true;
      case GearTypes.EFF_BLESS:
        this.effectBless(this.pick as itArms);
        return true;
      case GearTypes.EFF_LUCK:
        this.effectLuck(this.pick as itArms);
        return true;
      case GearTypes.EFF_FLAME:
        this.effectFlame(this.pick as itArms);
        return true;
      case GearTypes.EFF_ENCHANT:
        this.effectEnchant(this.pick as itArms);
        return true;
      case GearTypes.EFF_GRANT:
        this.effectGrant(this.pick as Item);
        return true;
      case GearTypes.EFF_FOOD:
        Screen.getHero().doFood();
        return true;
      default:
        return false;
    }
  }

  /** Java `effectFaceless()`. */
  effectFaceless(): void {
    Screen.getHero().doFaceless();
    Tools.setRegion(
      new arNotice(
        new arPeer(this, 2, String(Screen.getHero().getName())),
        "\tYou feel your features dissolve into an indistinct and shapeless form.",
      ),
    );
  }

  /** Java `effectScribe(Item)`. */
  effectScribe(what: Item): void {
    Tools.setRegion(new arScribe(this, what.getName()));
  }

  /** Java `effectGrant(Item)`. */
  effectGrant(what: Item): void {
    Tools.setRegion(new arNotice(this, Screen.getHero().doGrant(what as itNote)));
  }

  /** Java `tryScroll(itArms)`: a scroll can fail against heavy material. */
  tryScroll(what: itArms): boolean {
    if (Tools.contest(Screen.getHero().getWits(), what.getPower())) {
      return true;
    }
    Tools.setRegion(
      new arNotice(
        this,
        `\tThe mass and material of the ${what.getName()} resists the power of your spell.  This scroll has been inneffective.\n`,
      ),
    );
    return false;
  }

  /** Java `effectGlow(itArms)`. */
  effectGlow(what: itArms): void {
    this.addArmsTrait(what, ArmsTrait.GLOWS);
  }

  /** Java `effectLuck(itArms)`. */
  effectLuck(what: itArms): void {
    this.addArmsTrait(what, ArmsTrait.LUCKY);
  }

  /** Java `effectFlame(itArms)`. */
  effectFlame(what: itArms): void {
    this.addArmsTrait(what, ArmsTrait.FLAME);
  }

  /** Java `addArmsTrait(itArms, String)`. */
  addArmsTrait(what: itArms, trait: string): void {
    if (this.tryScroll(what)) {
      what.fixTrait(trait);
      this.detailItem(what);
    }
  }

  /** Java `effectIdentify(itArms)`. */
  effectIdentify(what: itArms): void {
    if (this.tryScroll(what)) {
      if (what.hasTrait(ArmsTrait.SECRET)) {
        what.clrTrait(ArmsTrait.SECRET);
      } else {
        what.revealCurse();
      }
      this.detailItem(what);
    }
  }

  /** Java `effectBless(itArms)`. */
  effectBless(what: itArms): void {
    if (!this.tryScroll(what)) {
      return;
    }
    if (what.isCursed()) {
      what.clrTrait(ArmsTrait.CURSED);
      what.clrTrait(ArmsTrait.CURSE);
      Tools.setRegion(
        new arNotice(
          this,
          `\tThe ${what.getName()} flashes and sparkles first red then blue as a terrible curse is lifted...\n`,
        ),
      );
      return;
    }
    what.fixTrait(ArmsTrait.BLESS);
    this.detailItem(what);
  }

  /** Java `effectEnchant(itArms)`: enchanting can destroy the item and the hero. */
  effectEnchant(what: itArms): void {
    if (!this.tryScroll(what)) {
      return;
    }
    what.incEnchant();
    const power = what.getPower();
    const dif = what.getEnchant() - what.getPower();
    if (dif < 0) {
      this.detailItem(what);
    } else if (!Tools.contest(dif, power)) {
      Tools.setRegion(
        new arNotice(
          new arDetail(this, what),
          `\tThe ${what.getName()} pulses with a dangerous purple light.`,
        ),
      );
    } else {
      if (Screen.getGear().drop(what) === null) {
        this.removePack(what);
      }
      const msg = `\tThere is a hot, steamy explosion as your ${what.getName()} suddenly disintegrates into whirling, melting, whining and floating fragments!  The magical energies penetrate your body causing -${dif} wounds!\n`;
      Screen.getHero().addWounds(dif);
      if (Screen.getHero().isDead()) {
        Tools.setRegion(
          Screen.getHero().killedScreen(
            this.getHome(),
            msg.concat("\n\tYou have been killed!\n"),
            false,
          ),
        );
      } else {
        Tools.setRegion(new arNotice(this, msg));
      }
    }
  }
}
