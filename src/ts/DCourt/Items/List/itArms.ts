import { Buffer } from "../../Tools/Buffer";
import { Tools } from "../../Tools/Tools";
import { Item } from "../Item";
import { itList } from "../itList";
import { itCount } from "../Token/itCount";
import { ArmsTrait } from "../../Static/ArmsTrait";

const MEGATWEAK = 2048;
const DECAY_FACTOR = 12; // used only by the (disabled) decay body below

/**
 * Java: DCourt/Items/List/itArms.class
 *
 * A weapon/armour piece (`{itArms|name|atk|def|skl|traits...}`).
 */
export class itArms extends itList {
  private aval!: itCount;

  private dval!: itCount;

  private sval!: itCount;

  public constructor();

  public constructor(id: string | null);

  public constructor(id: string | null, atk: number, def: number, skl: number);

  public constructor(it: itArms);

  public constructor(idOrIt?: string | itArms | null, atk = 0, def = 0, skl = 0) {
    if (idOrIt instanceof itArms) {
      super(idOrIt);
      this.setVals(idOrIt.getAttack(), idOrIt.getDefend(), idOrIt.getSkill());
    } else {
      super(idOrIt === undefined ? null : idOrIt);
      this.setVals(atk, def, skl);
    }
  }

  public override copy(): Item {
    return new itArms(this);
  }

  public override getIcon(): string {
    return "itArms";
  }

  public override toString(depth = 0): string {
    return (
      this.toStringHead(depth) +
      "|" +
      this.getAttack() +
      "|" +
      this.getDefend() +
      "|" +
      this.getSkill()
    ).concat(this.listBody(depth));
  }

  private setVals(a: number, d: number, s: number): void {
    this.aval = new itCount("a", a);
    this.dval = new itCount("d", d);
    this.sval = new itCount("s", s);
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

  public getAttack(): number {
    return this.aval.getCount();
  }

  public getDefend(): number {
    return this.dval.getCount();
  }

  public getSkill(): number {
    return this.sval.getCount();
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

  public subAttack(num: number): void {
    this.aval.adds(-num);
  }

  public subDefend(num: number): void {
    this.dval.adds(-num);
  }

  public subSkill(num: number): void {
    this.sval.adds(-num);
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin() || !buf.match("itArms") || !buf.split()) {
      return null;
    }
    const what = new itArms(buf.token());
    if (buf.split()) {
      what.setAttack(buf.num());
    }
    if (buf.split()) {
      what.setDefend(buf.num());
    }
    if (buf.split()) {
      what.setSkill(buf.num());
    }
    what.loadBody(buf);
    return what;
  }

  public override toLoot(): string {
    return this.toShow();
  }

  public override toShow(): string {
    const msg = this.getName();
    if (this.hasTrait(ArmsTrait.SECRET)) {
      return msg.concat("[?]");
    }
    let msg2 = msg.concat("[");
    if (this.fullAttack() > 0) {
      msg2 = msg2.concat("+");
    }
    if (this.fullAttack() !== 0) {
      msg2 = msg2.concat(this.fullAttack() + "a");
    }
    if (this.fullDefend() > 0) {
      msg2 = msg2.concat("+");
    }
    if (this.fullDefend() !== 0) {
      msg2 = msg2.concat(this.fullDefend() + "d");
    }
    if (this.fullSkill() > 0) {
      msg2 = msg2.concat("+");
    }
    if (this.fullSkill() !== 0) {
      msg2 = msg2.concat(this.fullSkill() + "s");
    }
    if (this.hasTrait(ArmsTrait.DECAY)) {
      msg2 = msg2.concat("@");
    }
    if (this.hasTrait(ArmsTrait.CURSE)) {
      msg2 = msg2.concat("*");
    }
    return msg2.concat("]");
  }

  public override fullAttack(): number {
    let num = this.getAttack();
    if (this.hasTrait(ArmsTrait.RIGHT) && this.hasTrait(ArmsTrait.FLAME)) {
      num += 8;
    }
    return num + Math.trunc((this.getEnchant() + 9) / 10);
  }

  public override fullDefend(): number {
    let num = this.getDefend();
    if (this.hasTrait(ArmsTrait.BLESS)) {
      num++;
    }
    return num + Math.trunc((this.getEnchant() + 4) / 10);
  }

  public override fullSkill(): number {
    let num = this.getSkill();
    if (this.hasTrait(ArmsTrait.RIGHT) && this.hasTrait(ArmsTrait.LUCKY)) {
      num += 12;
    }
    if (this.hasTrait(ArmsTrait.GLOWS)) {
      num += 2;
    }
    return num + this.getEnchant();
  }

  public getPower(): number {
    const power = this.getAttack() * 3 + this.getDefend() * 2 + this.getSkill();
    if (power < 1) {
      return 1;
    }
    return power;
  }

  public getEnchant(): number {
    return this.getCount(ArmsTrait.ENCHANT);
  }

  public incEnchant(): void {
    this.add(ArmsTrait.ENCHANT, 1);
  }

  public setEnchant(val: number): void {
    this.fix(ArmsTrait.ENCHANT, val);
  }

  public isBright(): boolean {
    return this.hasTrait(ArmsTrait.GLOWS) || this.hasTrait(ArmsTrait.FLAME);
  }

  public isCursed(): boolean {
    return this.hasTrait(ArmsTrait.CURSE) || this.hasTrait(ArmsTrait.CURSED);
  }

  public revealCurse(): void {
    if (this.hasTrait(ArmsTrait.CURSED)) {
      this.clrTrait(ArmsTrait.CURSED);
      this.fixTrait(ArmsTrait.CURSE);
    }
  }

  public wearable(): boolean {
    for (let ix = 0; ix < ArmsTrait.END_WEAR_TRAIT; ix++) {
      if (this.hasTrait(ix)) {
        return true;
      }
    }
    return false;
  }

  /** Java: `hasTrait(int)` overload — resolves the trait label. */
  public override hasTrait(idOrNum: string | number): boolean {
    return super.hasTrait(
      typeof idOrNum === "number" ? ArmsTrait.traitLabel[idOrNum] : idOrNum,
    );
  }

  /** Java: `fixTrait(int)` overload — resolves the trait label. */
  public override fixTrait(idOrNum: string | number): void {
    super.fixTrait(typeof idOrNum === "number" ? ArmsTrait.traitLabel[idOrNum] : idOrNum);
  }

  /** Java: `clrTrait(int)` overload — resolves the trait label. */
  public override clrTrait(idOrNum: string | number): void {
    super.clrTrait(typeof idOrNum === "number" ? ArmsTrait.traitLabel[idOrNum] : idOrNum);
  }

  public override decay(_rate: number): boolean {
    this.clrTrait(ArmsTrait.DECAY);
    return false;

    // DISABLED, DECAY IS GAY
    /*
    let rate = _rate;
    if (rate < 2) {
      rate = 2;
    }
    if (Tools.roll(rate) > 0) {
      return false;
    }
    this.fixTrait(ArmsTrait.DECAY);
    let num = this.getAttack();
    this.subAttack(num <= 1 ? 1 - Math.trunc(num / DECAY_FACTOR) : 1 + Math.trunc(num / DECAY_FACTOR));
    let num2 = this.getDefend();
    this.subDefend(num2 <= 1 ? 1 - Math.trunc(num2 / DECAY_FACTOR) : 1 + Math.trunc(num2 / DECAY_FACTOR));
    let num3 = this.getSkill();
    this.subSkill(num3 <= 1 ? 1 - Math.trunc(num3 / DECAY_FACTOR) : 1 + Math.trunc(num3 / DECAY_FACTOR));
    if (Tools.roll(12) != 0) {
      return true;
    }
    this.clrTrait(ArmsTrait.VISIBLE_TRAIT + Tools.roll(ArmsTrait.ENCHANT_TRAIT - ArmsTrait.VISIBLE_TRAIT));
    this.sub(ArmsTrait.ENCHANT, Math.trunc((this.getEnchant() + 4) / 5));
    return true;
    */
  }

  public tweak(): void {
    let sum = this.getPower();
    const value = 7 + Tools.twice(4) + Tools.skew(50);
    const num = this.getAttack();
    this.setAttack(num < 0 ? Math.trunc((num * 10) / value) : Math.trunc((num * value) / 10));
    const num2 = this.getDefend();
    this.setDefend(num2 < 0 ? Math.trunc((num2 * 10) / value) : Math.trunc((num2 * value) / 10));
    const num3 = this.getSkill();
    this.setSkill(num3 < 0 ? Math.trunc((num3 * 10) / value) : Math.trunc((num3 * value) / 10));
    while (true) {
      const value2 = Tools.roll(MEGATWEAK);
      if (value2 >= sum) {
        break;
      }
      sum -= value2;
      const trait =
        ArmsTrait.VISIBLE_TRAIT +
        Tools.roll(ArmsTrait.ENCHANT_TRAIT - ArmsTrait.VISIBLE_TRAIT);
      if ((value2 & 1) === 0) {
        this.clrTrait(trait);
      } else {
        this.fixTrait(trait);
      }
    }
    if (this.isCursed()) {
      this.clrTrait(ArmsTrait.CURSE);
      this.fixTrait(ArmsTrait.CURSED);
    }
    if (this.isCursed() || this.stockValue() >= 70) {
      this.fixTrait(ArmsTrait.SECRET);
    }
  }

  public stockValue(): number {
    if (this.hasTrait(ArmsTrait.SECRET) || this.hasTrait(ArmsTrait.CURSE)) {
      return 2;
    }
    const num = this.getAttack() + this.getDefend();
    const value = (num > 0 ? 1 : -1) * num * num * 5;
    const num2 = this.getSkill();
    let value2 = Math.trunc((value + (num2 > 0 ? 1 : -1) * num2 * num2 * 2) / 2);
    for (let ix = ArmsTrait.VALUED_TRAIT; ix < ArmsTrait.traitLabel.length; ix++) {
      const it = this.find(ArmsTrait.traitLabel[ix]);
      if (it !== null) {
        value2 += it.getCount() * ArmsTrait.traitValue[ix];
      }
    }
    return value2;
  }
}

Item.registerFactory("{itArms|", (buf: Buffer): Item | null => itArms.factory(buf));
