import { Buffer } from "../../Tools/Buffer";
import { Tools, logError } from "../../Tools/Tools";
import { Item } from "../Item";
import { itList } from "../itList";
import { itCount } from "../Token/itCount";
import { itText } from "./itText";
import { itNote } from "./itNote";
import { itArms } from "./itArms";
import { itAgent } from "./itAgent";
import { Portrait } from "../../ui/portrait";
import { GearTable } from "../../Control/GearTable";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { GearTypes } from "../../Static/GearTypes";

// Side-effect imports: make sure every class that can appear inside a monster
// definition is registered with Item.factory (see the factory note in Item.ts).
import "../Token/itRandom";
import "../Token/itPercent";

const PASSION = "passion";
const TEXT = "text";

/** Java `(int)` cast of a float/double: truncates toward zero, saturates on ±Infinity. */
function javaIntCast(val: number): number {
  if (Number.isNaN(val)) {
    return 0;
  }
  if (val === Infinity) {
    return 2147483647;
  }
  if (val === -Infinity) {
    return -2147483648;
  }
  return Math.trunc(val);
}

/**
 * Java: DCourt/Items/List/itMonster.class
 *
 * A monster template as stored in `MonsterTable`
 * (`{itMonster|name|guts|wits|charm|baseA|baseD|baseS|<lists>}`).
 */
export class itMonster extends itAgent {
  public static readonly PASSIVE = "passive";

  public static readonly DEFENSIVE = "defensive";

  public static readonly HOSTILE = "hostile";

  public static readonly AGGRESIVE = "aggresive";

  private picture: Portrait | null = null;

  // Java builds the Portrait eagerly inside fixLists(); the path is kept here and
  // the shared-portrait DOM object is only created on first use.
  private pic!: string | null;

  private text!: itText | null;

  private opts!: itList | null;

  private baseA = 0;

  private baseD = 0;

  private baseS = 0;

  private stance = 0;

  public constructor(name: string | null);

  public constructor(it: itMonster);

  public constructor(nameOrIt: string | itMonster | null) {
    if (nameOrIt instanceof itMonster) {
      super(nameOrIt);
      this.baseA = nameOrIt.baseA;
      this.baseD = nameOrIt.baseD;
      this.baseS = nameOrIt.baseS;
      this.fixLists();
    } else {
      super(nameOrIt);
    }
  }

  public override copy(): Item {
    return new itMonster(this);
  }

  public override getIcon(): string {
    return "itMonster";
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
      "|" +
      this.getAttack() +
      "|" +
      this.getDefend() +
      "|" +
      this.getSkill() +
      "\n\t"
    ).concat(this.listBody(depth));
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin() || !buf.match("itMonster") || !buf.split()) {
      return null;
    }
    const who = new itMonster(buf.token());
    who.loadAttributes(buf);
    who.loadSecondary(buf);
    who.loadBody(buf);
    who.fixLists();
    return who;
  }

  /** Java: package-private `loadSecondary`. */
  public loadSecondary(buf: Buffer): void {
    if (buf.split()) {
      this.baseA = buf.num();
    }
    if (buf.split()) {
      this.baseD = buf.num();
    }
    if (buf.split()) {
      this.baseS = buf.num();
    }
  }

  public override fixLists(): void {
    super.fixLists();
    this.text = this.find(TEXT) as itText | null;
    if (this.text === null) {
      logError("ERR: [text=null] for [" + this + "]");
    }
    const it = this.find("pic");
    if (it === null) {
      logError("ERR: [pic=null] for [" + this + "]");
    } else {
      this.pic = it.getValue();
    }
    this.opts = this.findList("opts");
    if (this.text === null) {
      logError("ERR: [opts=null] for [" + this + "]");
    }
  }

  public balance(weight: number): void {
    if (this.isMatch(Constants.DRAGON) && Tools.getHero()!.hasTrait(Constants.DRAGON)) {
      this.getOptions().append("trade");
      this.stance--;
    }
    this.calcPrimary(weight);
    this.calcCombat();
    this.calcSecondary(weight);
    this.buildPack();
    this.buildGear(this.getGear().select(0) as Item);
    this.buildGear(this.getGear().select(1) as Item);
  }

  /** Java: package-private `alterGuts`. */
  public alterGuts(val: number): void {
    this.setGuts(javaIntCast(this.getGuts() * val));
  }

  /** Java: package-private `alterWits`. */
  public alterWits(val: number): void {
    this.setWits(javaIntCast(this.getWits() * val));
  }

  /** Java: package-private `alterCharm`. */
  public alterCharm(val: number): void {
    this.setCharm(javaIntCast(this.getCharm() * val));
  }

  /** Java: package-private `calcPrimary`. */
  public calcPrimary(weight: number): void {
    const id = this.text!.getIdentity();
    if (id !== null) {
      this.setName(id);
    }
    const hero = Tools.getHero()!;
    const ratio = 0.9 + hero.getLevel() * 0.1;
    this.alterGuts(ratio);
    this.alterWits(ratio);
    this.alterCharm(ratio);
    this.setGuts(Tools.spread(this.getGuts()));
    this.setWits(Tools.spread(this.getWits()));
    this.setCharm(Tools.spread(this.getCharm()));
    if (this.hasTrait("adjust")) {
      const denom = Math.trunc(this.getPower() / hero.getPower());
      const ratio2 = (1.0 + weight * 0.1) / denom;
      if (ratio2 > 1.0) {
        this.alterGuts(ratio2);
        this.alterWits(ratio2);
        this.alterCharm(ratio2);
        this.baseA = javaIntCast(this.baseA * ratio2);
        this.baseD = javaIntCast(this.baseD * ratio2);
        this.baseS = javaIntCast(this.baseS * ratio2);
      }
    }
  }

  /** Java: package-private `calcSecondary`. */
  public calcSecondary(weight: number): void {
    let num = this.tempCount(Constants.ACTIONS);
    if (num === 0) {
      num = 1;
      this.fixTemp(Constants.ACTIONS, 1);
    }
    this.fixStatus(Constants.ACTIONS, num);
    this.fixStatus(
      Constants.FAME,
      Math.trunc((this.getGuts() + this.getWits() + this.getCharm()) / 30) +
        Math.trunc((this.thief() + this.magic() + this.fight() + weight) / 4),
    );
    this.fixStatus(
      Constants.EXP,
      Math.trunc(((1 + this.getAttack() + this.getDefend()) * (100 + this.getSkill())) / 100),
    );
    const passion = this.getValues().getValue(PASSION);
    if ("aggressive" === passion) {
      this.stance = 4;
    } else if (itMonster.HOSTILE === passion) {
      this.stance = 3;
    } else if (itMonster.DEFENSIVE === passion) {
      this.stance = 2;
    } else if ("timid" === passion) {
      this.stance = 1;
    } else if (itMonster.PASSIVE === passion) {
      this.stance = 0;
    } else {
      this.stance = 2;
      logError("Unknown [passion=" + passion + "] for [" + this + "]");
    }
  }

  /** Java: package-private `buildPack`. */
  public buildPack(): void {
    const pack = this.getPack();
    const from = pack.copy() as itList;
    pack.clrQueue();
    for (let ix = 0; ix < from.getCount(); ix++) {
      const it = from.select(ix)!;
      if (GearTable.find(it)) {
        if (it instanceof itNote) {
          pack.append(it);
        } else {
          const make = GearTable.shopItem(it);
          if (!(make instanceof itArms)) {
            const num = (it as itCount).makeCount();
            if (num >= 1) {
              make!.setCount(num);
              pack.append(make);
            }
          } else if (
            Tools.percent(it.getCount()) &&
            (!make.getName().startsWith("Silver") || Tools.percent(10))
          ) {
            make.tweak();
            pack.append(make);
          }
        }
      }
    }
  }

  /** Java: package-private `buildGear`. */
  public buildGear(it: Item): void {
    if ((it as itCount).makeCount() >= 1) {
      const make = GearTable.shopItem(it) as itArms | null;
      if (make !== null && make !== undefined) {
        make.tweak();
        if (this.getGear().hasTrait(ArmsTrait.CURSE) && Tools.percent(25)) {
          make.fixTrait(ArmsTrait.CURSED);
        }
        if (this.getGear().hasTrait(ArmsTrait.BLESS)) {
          make.fixTrait(ArmsTrait.BLESS);
        }
        this.getPack().append(make);
      }
    }
  }

  public testGear(): void {
    for (let ix = 0; ix < this.getPack().getCount(); ix++) {
      GearTable.find(this.getPack().select(ix)!);
    }
    this.testItem(this.getGear().select(0), "weapon");
    this.testItem(this.getGear().select(1), "armour");
  }

  /** Java: package-private `testItem`. */
  public testItem(it: Item | null, type: string): void {
    if (it === null) {
      logError("ERR: No " + type + " for " + this.getName());
    } else if (!(it instanceof itCount)) {
      logError("ERR: Bad " + type + " for " + this.getName());
    } else if (it.getCount() > 0) {
      GearTable.find(it);
    }
  }

  public resetActions(): void {
    const acts = this.getActions();
    const temp = this.getTemp();
    if (this.hasTrait("Blind")) {
      temp.zero(Constants.ACTIONS);
    } else {
      temp.fix(Constants.ACTIONS, this.statusCount(Constants.ACTIONS));
    }
    acts.clrQueue();
    acts.setName(Constants.ATTACK);
    this.setState(itAgent.ALIVE);
  }

  public getText(): string {
    return this.text!.getText();
  }

  public override getPicture(): Portrait {
    if (this.picture === null && this.pic !== null) {
      // Java: `this.picture = new Portrait(it.getValue(), 0, 0, 80, 80); picture.setType(2);`
      this.picture = new Portrait(this.pic, 0, 0, 80, 80);
      this.picture.setType(2);
    }
    return this.picture as Portrait;
  }

  public getOptions(): itList {
    return this.opts as itList;
  }

  public baseExp(): number {
    return this.statusCount("exp");
  }

  public baseFame(): number {
    return this.statusCount(Constants.FAME);
  }

  public getWeapon(): string {
    return this.getGear().select(0)!.getName();
  }

  public getArmour(): string {
    return this.getGear().select(1)!.getName();
  }

  protected gearAttack(): number {
    return this.baseA;
  }

  protected gearDefend(): number {
    return this.baseD;
  }

  protected gearSkill(): number {
    return this.baseS;
  }

  public getStance(): number {
    return this.stance;
  }

  public incStance(): void {
    this.stance++;
  }

  public setPassive(): void {
    this.stance = 0;
  }

  public isAggresive(): boolean {
    return this.stance >= 4;
  }

  public isHostile(): boolean {
    return this.stance === 3;
  }

  public isDefensive(): boolean {
    return this.stance === 2;
  }

  public isPassive(): boolean {
    return this.stance <= 1;
  }

  public chooseActions(first: boolean): void {
    const enemy = Tools.getHero()!;
    let pm = this.packMagic();
    const ph = this.packHeal();
    let sk = this.guildSkill();
    const acts = this.getActions();
    const temp = this.getTemp();
    acts.setName(Constants.ATTACK);
    if (this.actions() < 1) {
      this.useSkills(first);
      return;
    }
    if ((this.hasTrait("Blind") || this.hasTrait("Panic")) && this.subPack(GearTypes.SELTZER, 1) === 1) {
      acts.add(GearTypes.SELTZER, 1);
      temp.clrTrait("Blind");
      temp.clrTrait("Panic");
      this.useAction();
    }
    const num = this.getWounds();
    const val = this.actions();
    if (num > val * 20 && ph > val && this.subPack(GearTypes.GINSENG, 1) === 1) {
      acts.add(GearTypes.GINSENG, 1);
      temp.add(Constants.ACTIONS, 2);
    }
    const num2 = num - this.actionHeal(GearTypes.TROLL, num, 30);
    const num3 = num2 - this.actionHeal(GearTypes.APPLE, num2, 30);
    const num4 = num3 - this.actionHeal(GearTypes.SALVE, num3, 15);
    if (temp.getCount(Constants.GOAT) > 0) {
      acts.setName(Constants.GOAT);
      temp.sub(Constants.GOAT, 1);
    } else if (temp.getCount(Constants.WORM) > 0) {
      acts.setName(Constants.WORM);
      temp.sub(Constants.WORM, 1);
    } else {
      const danger = this.getPower();
      const danger2 = Math.trunc(((enemy.getPower() - danger) * 4) / danger);
      let num5 = this.actions() + this.packCount(GearTypes.GINSENG) * 2;
      if (pm > num5) {
        pm = num5;
      }
      if (sk > 0) {
        sk += danger2;
      }
      if (Tools.contest(pm, first ? sk - this.fight() : sk - this.thief())) {
        this.useMagic();
      } else {
        this.useSkills(first);
      }
    }
  }

  /** Java: package-private `useMagic`. */
  public useMagic(): void {
    let bd = this.packCount(GearTypes.BLIND_DUST);
    let pn = this.packCount(GearTypes.PANIC_DUST);
    let bt = this.packCount(GearTypes.BLAST_DUST);
    const acts = this.getActions();
    const temp = this.getTemp();
    acts.setName(Constants.SPELLS);
    while (bd + pn > this.actions() && this.subPack(GearTypes.GINSENG, 1) === 1) {
      acts.add(GearTypes.GINSENG, 1);
      temp.add(Constants.ACTIONS, 2);
    }
    while (bd + pn + bt > 0 && this.actions() > 0) {
      if (Tools.contest(bd, pn + bt)) {
        this.subPack(GearTypes.BLIND_DUST, 1);
        acts.add("Blind", 1);
        bd--;
      } else if (Tools.contest(pn, bt)) {
        this.subPack(GearTypes.PANIC_DUST, 1);
        acts.add("Panic", 1);
        pn--;
      } else {
        this.subPack(GearTypes.BLAST_DUST, 1);
        acts.add(ArmsTrait.BLAST, 1);
        bt--;
      }
      this.useAction();
    }
  }

  /** Java: package-private `useSkills`. */
  public useSkills(first: boolean): void {
    const wr = this.fight();
    const mg = this.magic();
    const tf = this.thief();
    const sm = this.ieatsu();
    const acts = this.getActions();
    if (Tools.roll(3) >= this.stance) {
      acts.setName(Constants.RUNAWAY);
    } else if (first) {
      if (tf + mg + sm >= 1) {
        if (Tools.contest(mg, tf + sm)) {
          acts.setName("Control");
        } else if (Tools.contest(sm, tf)) {
          acts.setName(Constants.IEATSU);
        } else {
          acts.setName(Tools.roll(2) === 0 ? "Swindle" : Constants.BACKSTAB);
        }
      }
    } else if (mg + wr >= 1) {
      if (Tools.contest(mg, wr)) {
        acts.setName("Control");
      } else {
        acts.setName(Constants.BERZERK);
      }
    }
  }

  /** Java: package-private `actionHeal`. */
  public actionHeal(id: string, wounds: number, val: number): number {
    let num = Math.trunc((wounds + Math.trunc(val / 2)) / val);
    const has = this.packCount(id);
    if (num > has) {
      num = has;
    }
    const has2 = this.actions();
    if (num > has2) {
      num = has2;
    }
    this.useAction(num);
    this.getActions().add(id, num);
    return num * val;
  }

  public goatSkill(): string {
    const h = Tools.getHero();
    this.getActions().setName(Constants.ATTACK);
    const val = h.packCount("Rope");
    if (!Tools.contest(2 * this.getGuts(), h.getGuts()) || val === 0) {
      return "";
    }
    let num = 1 + Tools.roll(4) + Tools.roll(4);
    if (num > val) {
      num = val;
    }
    h.subPack("Rope", num);
    return "\tThe " + this.getName() + " steals and devours " + num + " pieces of rope!  Baa-a-a-a!\n";
  }

  public wormSkill(): string {
    const h = Tools.getHero();
    this.getActions().setName(Constants.ATTACK);
    if (!Tools.contest(2 * this.getGuts(), h.getGuts())) {
      return "";
    }
    let it = h.findGearTrait(ArmsTrait.GLOWS);
    if (it === null) {
      it = h.findGearTrait(ArmsTrait.FLAME);
    }
    if (it === null) {
      return "";
    }
    h.dropGear(it);
    it.decay(3);
    this.getPack().insert(it);
    return "\tThe " + this.getName() + " rips the " + it.getName() + " from your body and swallows it whole!\n";
  }
}

Item.registerFactory("{itMonster|", (buf: Buffer): Item | null => itMonster.factory(buf));
