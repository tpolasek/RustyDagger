import { Buffer } from "../../Tools/Buffer";
import { Item } from "../Item";
import { itList } from "../itList";
import { itCount } from "../Token/itCount";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { GearTypes } from "../../Static/GearTypes";
// Type-only: `Portrait` lives in the DOM layer and is only returned/typed here.
import type { Portrait } from "../../ui/portrait";
// Type-only: `itArms extends itList` (see the factory note in Item.ts).
import type { itArms } from "./itArms";

const STATE = "state";
const PACK = "pack";
const GEAR = "gear";
const STAT = "stat";
const TEMP = "temp";
const ACTS = "acts";
const RANK = "rank";
const OPTS = "opts";
const PIC = "pic";
const VALUES = "values";

/**
 * Java: DCourt/Items/List/itAgent.class
 *
 * Common base of itHero and itMonster: attributes (guts/wits/charm/attack/
 * defend/skill) plus the standard named sub-lists (pack, gear, stat, temp, rank,
 * values, acts).
 *
 * NOTE: Java's `implements Constants, GearTypes, ArmsTrait` disappears — those
 * interfaces are plain constant objects in the TS port.
 */
export abstract class itAgent extends itList {
  public static readonly ALIVE = "Alive";

  public static readonly DEAD = "Dead";

  public static readonly CREATE = "Create";

  public static readonly CONTROL = "Control";

  public static readonly SWINDLE = "Swindle";

  // Java has a *method* `picfile(String)` next to a private field named `picfile`;
  // TypeScript forbids that clash, so the field is spelled `picFile`.
  private picFile!: string | null;

  private gval!: itCount;

  private wval!: itCount;

  private cval!: itCount;

  private aval!: itCount;

  private dval!: itCount;

  private sval!: itCount;

  // Assigned by fixLists(); Java leaves them null until then, so they must not
  // get an initialiser here (it would run *after* super() and wipe the lists the
  // virtual fixLists() call filled in during a copy construction).
  private pack!: itList;

  private gear!: itList;

  private stat!: itList;

  private temp!: itList;

  private rank!: itList;

  private vals!: itList;

  private acts!: itList;

  public abstract getWeapon(): string;

  public abstract getArmour(): string;

  protected abstract gearAttack(): number;

  protected abstract gearDefend(): number;

  protected abstract gearSkill(): number;

  public constructor(id: string | null);

  public constructor(it: itAgent);

  public constructor(idOrIt: string | itAgent | null);

  public constructor(idOrIt: string | itAgent | null) {
    if (idOrIt instanceof itAgent) {
      super(idOrIt);
      this.setVals(
        idOrIt.getGuts(),
        idOrIt.getWits(),
        idOrIt.getCharm(),
        idOrIt.getAttack(),
        idOrIt.getDefend(),
        idOrIt.getSkill(),
      );
      this.fixLists();
    } else {
      super(idOrIt);
      this.setVals(0, 0, 0, 0, 0, 0);
    }
  }

  public setVals(g: number, w: number, c: number, a: number, d: number, s: number): void {
    this.gval = new itCount("g", g);
    this.wval = new itCount("w", w);
    this.cval = new itCount("c", c);
    this.aval = new itCount("a", a);
    this.dval = new itCount("d", d);
    this.sval = new itCount("s", s);
  }

  public setGuts(num: number): void {
    this.gval.setCount(num);
  }

  public setWits(num: number): void {
    this.wval.setCount(num);
  }

  public setCharm(num: number): void {
    this.cval.setCount(num);
  }

  public setAttack(num: number): void {
    this.aval.setCount(num);
  }

  public setDefend(num: number): void {
    this.dval.setCount(num);
  }

  public setSkill(num: number): void {
    this.sval.setCount(num);
  }

  public addGuts(num: number): void {
    this.gval.adds(num);
  }

  public addWits(num: number): void {
    this.wval.adds(num);
  }

  public addCharm(num: number): void {
    this.cval.adds(num);
  }

  public addAttack(num: number): void {
    this.aval.adds(num);
  }

  public addDefend(num: number): void {
    this.dval.adds(num);
  }

  public addSkill(num: number): void {
    this.sval.adds(num);
  }

  public getGuts(): number {
    return this.gval.getCount();
  }

  public getWits(): number {
    return this.wval.getCount();
  }

  public getCharm(): number {
    return this.cval.getCount();
  }

  public getAttack(): number {
    return this.aval.getCount();
  }

  public getDefend(): number {
    return this.dval.getCount();
  }

  public getSkill(): number {
    return this.sval.getCount();
  }

  public override getIcon(): string {
    return "itAgent";
  }

  public override toString(depth = 0): string {
    return (
      this.toStringHead(depth) +
      "|" +
      this.getGuts() +
      "|" +
      this.getWits() +
      "|" +
      this.getCharm() +
      "\n\t"
    ).concat(this.listBody(depth));
  }

  public loadAttributes(buf: Buffer): void {
    if (buf.split()) {
      this.setGuts(buf.num());
    }
    if (buf.split()) {
      this.setWits(buf.num());
    }
    if (buf.split()) {
      this.setCharm(buf.num());
    }
  }

  public fixLists(): void {
    this.picFile = this.findValue(PIC);
    this.pack = this.findList(PACK);
    this.gear = this.findList(GEAR);
    this.stat = this.findList(STAT);
    this.temp = this.findList(TEMP);
    this.rank = this.findList(RANK);
    this.vals = this.findList(VALUES);
    this.acts = new itList(ACTS);
  }

  public findValue(name: string): string | null {
    const it = this.find(name);
    if (it === null) {
      return null;
    }
    return it.getValue();
  }

  public findList(name: string): itList {
    let it = this.find(name);
    if (it === null) {
      const itlist = new itList(name);
      it = itlist;
      this.append(itlist);
    }
    return it as itList;
  }

  /** Java declares `Portrait getPicture()` but returns null here; subclasses override. */
  public getPicture(): Portrait {
    return null as unknown as Portrait;
  }

  public getState(): string | null {
    return this.getValues().getValue(STATE);
  }

  public setState(val: string): void {
    this.getValues().fix(STATE, val);
  }

  public isAlive(): boolean {
    return itAgent.ALIVE === this.getState();
  }

  public isDead(): boolean {
    return itAgent.DEAD === this.getState();
  }

  public isCreate(): boolean {
    return itAgent.CREATE === this.getState();
  }

  public isControl(): boolean {
    return "Control" === this.getState();
  }

  public isSwindle(): boolean {
    return "Swindle" === this.getState();
  }

  // The named lists are null until fixLists() runs — exactly as in Java, where
  // calling a getter earlier throws a NullPointerException.
  public getPack(): itList {
    return this.pack as itList;
  }

  public getGear(): itList {
    return this.gear as itList;
  }

  public getStatus(): itList {
    return this.stat as itList;
  }

  public getTemp(): itList {
    return this.temp as itList;
  }

  public getActions(): itList {
    return this.acts as itList;
  }

  public getRank(): itList {
    return this.rank as itList;
  }

  public getValues(): itList {
    return this.vals as itList;
  }

  public rankCount(idOrItem: string | Item): number {
    return this.getRank().getCount(idOrItem);
  }

  public fixRank(id: string, num: number): void {
    this.getRank().fix(id, num);
  }

  public addRank(id: string, num: number): number {
    return this.getRank().add(id, num);
  }

  public subRank(id: string, num: number): number {
    return this.getRank().sub(id, num);
  }

  public tempCount(idOrItem: string | Item): number {
    return this.getTemp().getCount(idOrItem);
  }

  public fixTemp(id: string, num: number): void {
    this.getTemp().fix(id, num);
  }

  public addTemp(id: string, num: number): number {
    return this.getTemp().add(id, num);
  }

  public subTemp(id: string, num: number): number {
    return this.getTemp().sub(id, num);
  }

  public fixTempTrait(id: string): void {
    this.getTemp().fixTrait(id);
  }

  public clrTempTrait(id: string): void {
    this.getTemp().clrTrait(id);
  }

  public statusCount(idOrItem: string | Item): number {
    return this.getStatus().getCount(idOrItem);
  }

  public fixStatus(id: string, num: number): void {
    this.getStatus().fix(id, num);
  }

  public addStatus(id: string, num: number): number {
    return this.getStatus().add(id, num);
  }

  public subStatus(id: string, num: number): number {
    return this.getStatus().sub(id, num);
  }

  public fixStatTrait(id: string): void {
    this.getStatus().fixTrait(id);
  }

  public clrStatTrait(id: string): void {
    this.getStatus().clrTrait(id);
  }

  public findGearTrait(id: string): itArms | null {
    return this.getGear().findArms(id);
  }

  public dropGear(it: Item): void {
    this.getGear().drop(it);
  }

  /** Java: `packCount()`, `packCount(Item)` and `packCount(String)` overloads. */
  public packCount(idOrItem?: string | Item): number {
    if (idOrItem === undefined) {
      return this.getPack().getCount();
    }
    return this.getPack().getCount(idOrItem);
  }

  public fixPack(id: string, num: number): void {
    this.getPack().fix(id, num);
  }

  /** Java: `addPack(String,int)` and `addPack(Item)` overloads. */
  public addPack(id: string, num: number): number;

  public addPack(it: Item): void;

  public addPack(idOrItem: string | Item, num?: number): number | void {
    if (typeof idOrItem === "string") {
      return this.getPack().add(idOrItem, num === undefined ? 0 : num);
    }
    this.getPack().append(idOrItem);
  }

  public putPack(it: Item): void {
    this.getPack().insert(it);
  }

  /** Java: `subPack(String,int)` and `subPack(Item)` overloads. */
  public subPack(id: string, num: number): number;

  public subPack(it: Item): void;

  public subPack(idOrItem: string | Item, num?: number): number | void {
    if (typeof idOrItem === "string") {
      return this.getPack().sub(idOrItem, num === undefined ? 0 : num);
    }
    this.getPack().drop(idOrItem);
  }

  public selectPack(ix: number): Item | null {
    return this.getPack().select(ix);
  }

  public firstPack(id: string): number {
    return this.getPack().firstOf(id);
  }

  public indexPack(it: Item): number {
    return this.getPack().indexOf(it);
  }

  public override hasTrait(attribute: string): boolean {
    return this.temp!.hasTrait(attribute) || this.stat!.hasTrait(attribute);
  }

  public getPower(): number {
    return (
      0 +
      this.getAttack() * 4 +
      this.getDefend() * 4 +
      this.getSkill() +
      this.getGuts() * 2 +
      this.getWits() +
      this.getCharm() +
      this.scale(this.fight(), 12) +
      this.scale(this.magic(), 16) +
      this.scale(this.thief(), 8)
    );
  }

  public scale(guild: number, base: number): number {
    let num = 0;
    for (let i = guild; i > 0; i--) {
      num += Math.trunc(base / 2);
    }
    return num;
  }

  public calcCombat(): void {
    let num = Math.trunc((this.getWits() * 2 + this.getCharm() + 2) / 3) + this.gearSkill() + this.magicRank();
    if (num < 1) {
      num = 1;
    }
    if (this.hasTrait(Constants.AGILE)) {
      num += Math.trunc((num + 9) / 10);
    }
    this.setSkill(num);
    let num2 = this.gearAttack() + this.fightRank();
    if (this.hasTrait(Constants.STRONG)) {
      num2 += Math.trunc((num2 + 9) / 10);
    }
    this.setAttack(num2);
    let num3 = this.gearDefend() + this.thiefRank();
    if (this.hasTrait(Constants.STURDY)) {
      num3 += Math.trunc((num3 + 9) / 10);
    }
    this.setDefend(num3);
  }

  public runWits(): number {
    const val = Math.trunc((this.getWits() * (10 + this.thiefRank())) / 10);
    return this.hasTrait(Constants.SWIFT) ? val + 30 : val;
  }

  public bribeCharm(): number {
    return this.hasTrait(Constants.SINCERE) ? this.getCharm() + 30 : this.getCharm();
  }

  public tradeCharm(): number {
    return this.hasTrait(Constants.TRICKY) ? this.getCharm() + 30 : this.getCharm();
  }

  public feedCharm(): number {
    return this.hasTrait(Constants.EMPATHIC) ? this.getCharm() + 50 : this.getCharm();
  }

  public seduceCharm(): number {
    return this.hasTrait(Constants.SEXY) ? this.getCharm() + 50 : this.getCharm();
  }

  public getMoney(): number {
    return this.getPack().getCount("Marks");
  }

  public addMoney(num: number): number {
    return this.getPack().add("Marks", num);
  }

  public subMoney(num: number): number {
    return this.getPack().sub("Marks", num);
  }

  public getWounds(): number {
    return this.getTemp().getCount(Constants.WOUNDS);
  }

  public subWounds(num: number): number {
    return this.getTemp().sub(Constants.WOUNDS, num);
  }

  public addWounds(num: number): number {
    return this.getTemp().add(Constants.WOUNDS, num);
  }

  public disease(): number {
    return this.getTemp().getCount("Disease");
  }

  public ail(num: number): number {
    return this.getTemp().add("Disease", num);
  }

  public skill(): number {
    const num = this.getSkill() - this.disease();
    if (num < 1) {
      return 1;
    }
    return num;
  }

  public getLevel(): number {
    return this.getRank().getCount(Constants.LEVEL);
  }

  public picfile(path: string): void {
    if (path.length < 1) {
      this.picFile = null;
    } else {
      this.picFile = path;
    }
  }

  public fight(): number;

  public fight(num: number): void;

  public fight(num?: number): number | void {
    if (num === undefined) {
      return this.getTemp().getCount(Constants.FIGHT);
    }
    this.getTemp().sub(Constants.FIGHT, num);
  }

  public magic(): number;

  public magic(num: number): void;

  public magic(num?: number): number | void {
    if (num === undefined) {
      return this.getTemp().getCount(Constants.MAGIC);
    }
    this.getTemp().sub(Constants.MAGIC, num);
  }

  public thief(): number;

  public thief(num: number): void;

  public thief(num?: number): number | void {
    if (num === undefined) {
      return this.getTemp().getCount(Constants.THIEF);
    }
    this.getTemp().sub(Constants.THIEF, num);
  }

  public ieatsu(): number;

  public ieatsu(num: number): void;

  public ieatsu(num?: number): number | void {
    if (num === undefined) {
      return this.getTemp().getCount(Constants.IEATSU);
    }
    this.getTemp().sub(Constants.IEATSU, num);
  }

  public fightRank(): number {
    return this.getRank().getCount(Constants.FIGHT);
  }

  public magicRank(): number {
    return this.getRank().getCount(Constants.MAGIC);
  }

  public thiefRank(): number {
    return this.getRank().getCount(Constants.THIEF);
  }

  public ieatsuRank(): number {
    return this.getRank().getCount(Constants.IEATSU);
  }

  public guildRank(): number {
    return this.fightRank() + this.magicRank() + this.thiefRank() + this.ieatsuRank();
  }

  public guildSkill(): number {
    return this.fight() + this.magic() + this.thief() + this.ieatsu();
  }

  public actions(): number {
    return this.getTemp().getCount(Constants.ACTIONS);
  }

  public useAction(num?: number): boolean {
    const val = num === undefined ? 1 : num;
    return this.getTemp().sub(Constants.ACTIONS, val) === val;
  }

  public packHeal(): number {
    return (
      this.getPack().getCount(GearTypes.APPLE) +
      this.getPack().getCount(GearTypes.TROLL) +
      this.getPack().getCount(GearTypes.SALVE)
    );
  }

  public packMagic(): number {
    return (
      this.getPack().getCount(GearTypes.BLIND_DUST) +
      this.getPack().getCount(GearTypes.PANIC_DUST) +
      this.getPack().getCount(GearTypes.BLAST_DUST)
    );
  }

  public getPortrait(): Portrait {
    let msg = "";
    if (this.hasTrait("Blind")) {
      msg = msg.concat("*BLIND*\n");
    }
    if (this.hasTrait("Panic")) {
      msg = msg.concat("+PANIC+\n");
    }
    this.getPicture().setText(msg);
    return this.getPicture();
  }

  public doRefresh(): void {
    this.getTemp().sub(Constants.FATIGUE, 1);
  }

  public doHaste(): void {
    this.getTemp().add(Constants.ACTIONS, 2);
  }

  public doCookie(): void {
    this.getTemp().zero(Constants.FATIGUE);
  }

  public doCure(): void {
    this.getTemp().zero("Disease");
    this.getTemp().clrTrait("Blind");
    this.getTemp().clrTrait("Panic");
  }

  public doFood(): void {
    if (this.hasTrait(Constants.MEDIC)) {
      this.subWounds(3);
    } else {
      this.subWounds(2);
    }
  }

  public doHeal(): void {
    if (this.hasTrait(Constants.MEDIC)) {
      this.subWounds(25);
    } else {
      this.subWounds(15);
    }
  }

  public doRevive(): void {
    if (this.hasTrait(Constants.MEDIC)) {
      this.subWounds(50);
    } else {
      this.subWounds(30);
    }
    this.doCure();
  }

  public doPanic(): void {
    this.getActions().add("Panic", 1);
    this.getActions().setName(Constants.SPELLS);
  }

  public doBlind(): void {
    this.getActions().add("Blind", 1);
    this.getActions().setName(Constants.SPELLS);
  }

  public doBlast(): void {
    this.getActions().add(ArmsTrait.BLAST, 1);
    this.getActions().setName(Constants.SPELLS);
  }
}
