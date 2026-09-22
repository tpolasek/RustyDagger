import { Buffer } from "../../Tools/Buffer";
import { Tools, log } from "../../Tools/Tools";
import { MadLib } from "../../Tools/MadLib";
import { Item } from "../Item";
import { equalsIgnoreCase } from "../itToken";
import { itList } from "../itList";
import { itAgent } from "./itAgent";
import { itNote } from "./itNote";
import { Portrait } from "../../ui/portrait";
// The ported `Screen` base lives in the DOM layer (Java: DCourt.Screens.Screen).
import { Screen } from "../../ui/screen";
import { arNotice } from "../../Screens/Utility/arNotice";
import { arExit } from "../../Screens/Command/arExit";
import { arHealer } from "../../Screens/Areas/Fields/arHealer";
import { arField } from "../../Screens/Wilds/arField";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { GearTypes } from "../../Static/GearTypes";

// Java resolves Item's subclasses lazily via the class loader; ES modules cannot
// (see the factory note in Item.ts), so every Items class registers its factory
// prefix when its module loads.  These side-effect imports guarantee that every
// class which can appear inside a saved hero is registered as soon as itHero is.
import "../List/itArms";
import "../List/itText";
import "./itMonster";
import "../Token/itRandom";
import "../Token/itPercent";

const PLACE = "place";
const VERSION = 10;
const STORE = "store";
const DUMP = "dump";
const LOOKS = "looks";

const clanMsg =
  "\tWith the unsealing of the grant, you become a staunch member of the [ $clan$ ], able to call upon them for power and assistance.  Mystical energies course through your being, making betrayal an impossible concept.\n";
const flameMsg =
  "\tThis grant would be a betrayal of your clan. It bursts into flames, singeing your hands and blinding you.\n";

/**
 * Java: DCourt/Items/List/itHero.class
 *
 * The player character save record (`{itHero|name|guts|wits|charm|<lists>}`).
 */
export class itHero extends itAgent {
  private pass: string | null = null;

  private lastPlay: string | null = null;

  private best: string | null = null;

  private leader: string | null = null;

  private raise = 0;

  private sessionID = 0;

  private store: itList = new itList(STORE);

  private looks: itList = new itList(LOOKS);

  private dump: itList = new itList(DUMP);

  /*
   * Java builds the shared hero portrait in a static initialiser:
   *   private static Portrait picture = new Portrait("Faces/Hero.jpg", 0, 0, 80, 80);
   *   static { picture.setType(2); }
   * That would touch the DOM at module load (and break the logic-only node tests),
   * so the same single shared instance is created on first use instead.
   */
  private static picture: Portrait | null = null;

  private static heroPicture(): Portrait {
    if (itHero.picture === null) {
      itHero.picture = new Portrait("Faces/Hero.jpg", 0, 0, 80, 80);
      itHero.picture.setType(2);
    }
    return itHero.picture;
  }

  public constructor(id: string | null);

  public constructor(it: itHero);

  public constructor(idOrIt: string | itHero | null) {
    super(idOrIt);
  }

  public override copy(): Item {
    return new itHero(this);
  }

  public override getIcon(): string {
    return "itHero";
  }

  public static override factory(buf: Buffer): Item | null {
    if (!buf.begin()) {
      return null;
    }
    if (!(buf.match("itHero") || buf.match("itAgent")) || !buf.split()) {
      return null;
    }
    log("itHero.factory");
    const who = new itHero(buf.token());
    who.loadAttributes(buf);
    who.loadBody(buf);
    who.fixLists();
    return who;
  }

  public override fixLists(): void {
    super.fixLists();
    this.lastPlay = this.findValue("Date");
    this.store = this.findList(STORE);
    this.looks = this.findList(LOOKS);
    this.dump = new itList(this.dump);
  }

  public getStore(): itList {
    return this.store;
  }

  public getDump(): itList {
    return this.dump;
  }

  public getLooks(): itList {
    return this.looks;
  }

  public getVersion(): number {
    return this.getStatus().getCount(Constants.VERSION);
  }

  public setVersion(val: number): void {
    this.getStatus().fix(Constants.VERSION, val);
  }

  public storeCount(idOrItem: string | Item): number {
    return this.store.getCount(idOrItem);
  }

  public fixStore(id: string, num: number): void {
    this.store.fix(id, num);
  }

  public addStore(id: string, num: number): number {
    return this.store.add(id, num);
  }

  public subStore(id: string, num: number): number {
    return this.store.sub(id, num);
  }

  public override getPicture(): Portrait {
    return itHero.heroPicture();
  }

  public calcRaise(): void {
    this.raise = Math.trunc(50 * Math.pow(1.5, this.getLevel() - 1));
  }

  public getPlace(): string | null {
    return this.getValues().getValue(PLACE);
  }

  public setPlace(val: string): void {
    this.getValues().fix(PLACE, val);
  }

  public clearDump(): void {
    this.dump.clrQueue();
  }

  public doFaceless(): void {
    this.looks.clrQueue();
  }

  public doAging(): void {
    this.getStatus().add(Constants.AGE, 1);
  }

  public doYouth(): void {
    if (this.getAge() >= 9) {
      this.getStatus().sub(Constants.AGE, 1);
    }
  }

  public doExhaust(): void {
    this.getTemp().fix(Constants.FATIGUE, this.getBaseQuests());
  }

  /**
   * Java: `update(String tname, String powers)` overloads `itList.update(itList)`;
   * the port keeps both call shapes on a single method.
   */
  public override update(list: itList): void;

  public override update(tname: string, powers: string | null): boolean;

  public override update(listOrName: itList | string, powers?: string | null): void | boolean {
    if (typeof listOrName !== "string") {
      super.update(listOrName);
      return;
    }
    const tname = listOrName;
    Tools.setSeed(
      this.getLevel() + this.getExp() + this.getMoney() + this.getAge() + this.getFame() + this.guildRank(),
    );
    this.calcCombat();
    this.calcRaise();
    if (this.getVersion() !== VERSION) {
      this.getPack().fix("Cookie", 3);
      this.getPack().fix("Bottled Faery", 1);
      this.getPack().append(
        new itNote(
          "Letter",
          "Fred",
          "Hi There,\nThe changes to DC1 are now complete except for fixing bugs.  In order to celebrate, everyone gets a onetime gift of cookies and a bottled faery.  Thanks for helping out.\n-Fred-",
        ),
      );
      this.drop("end");
    }
    this.setVersion(VERSION);
    if (!Tools.isPlaytest() && (!this.isNewday() || itAgent.CREATE === this.getState())) {
      return true;
    }
    this.advance(powers ?? null);
    return true;
  }

  /** Java: package-private `advance`. */
  public advance(powers: string | null): void {
    const temp = this.getTemp();
    const stat = this.getStatus();
    temp.clrQueue();
    this.setState(itAgent.ALIVE);
    if (powers !== null) {
      for (let i = 0; i < Constants.TraitList.length; i++) {
        if (
          powers.indexOf(Constants.TraitList[i]) >= 0 ||
          powers.indexOf(Constants.TraitStub[i]) >= 0
        ) {
          temp.fixTrait(Constants.TraitList[i]);
        }
      }
    }
    temp.fix(Constants.FIGHT, this.fightRank());
    if (this.hasTrait(Constants.BERZERK)) {
      temp.add(Constants.FIGHT, Math.trunc((this.getLevel() + 7) / 8));
    }
    temp.fix(Constants.MAGIC, this.magicRank());
    if (this.hasTrait(Constants.MYSTIC)) {
      temp.add(Constants.MAGIC, Math.trunc((this.getLevel() + 7) / 8));
    }
    temp.fix(Constants.THIEF, this.thiefRank());
    if (this.hasTrait(Constants.TRADER)) {
      temp.add(Constants.THIEF, Math.trunc((this.getLevel() + 7) / 8));
    }
    temp.fix(Constants.IEATSU, this.ieatsuRank());
    if (this.getStatus().getCount(Constants.AGE) < 15) {
      this.getStatus().fix(Constants.AGE, 15);
    }
    if (!this.hasTrait(Constants.UNAGING)) {
      this.getStatus().add(Constants.AGE, 1);
    } else {
      if (this.getStatus().getCount(Constants.AGE) > 33) {
        this.getStatus().sub(Constants.AGE, 1);
      }
      if (this.getStatus().getCount(Constants.AGE) < 33) {
        this.getStatus().add(Constants.AGE, 1);
      }
    }
    const fame = this.getFame();
    const rank = this.getSocial();
    stat.fix(Constants.FAME, fame - Math.trunc(fame / 10) + rank * 10);
    stat.add(Constants.STIPEND, rank * rank * 50);
  }

  public rankString(): string {
    this.getPack();
    this.calcCombat();
    const place = itAgent.DEAD === this.getState() ? this.getState() : this.getPlace();
    const clan = this.getClan();
    return `{itList|${this.getName()}|${this.getSocial()}|${this.getAge()}|${this.getFame()}|${this.getSkill()}|${
      this.getAttack() + this.getDefend()
    }|${this.getGuts() + this.getWits() + this.getCharm()}|${
      this.getMoney() + this.getStore().getCount("Marks")
    }|${this.guildRank()}|${place}|${clan === null ? Constants.NONE : clan}}`;
  }

  protected gearAttack(): number {
    return this.getGear().fullAttack();
  }

  protected gearDefend(): number {
    return this.getGear().fullDefend();
  }

  protected gearSkill(): number {
    return this.getGear().fullSkill();
  }

  public getWeapon(): string {
    const it = this.getGear().findArms(ArmsTrait.RIGHT);
    return this.hasTrait("Blind") ? Constants.BLIND_STR : it === null ? "Fists" : it.getName();
  }

  public getArmour(): string {
    const it = this.getGear().findArms(ArmsTrait.BODY);
    return this.hasTrait("Panic") ? Constants.PANIC_STR : it === null ? Constants.SKIN : it.getName();
  }

  public gainExp(exp: number): string {
    if (exp < 1) {
      return "";
    }
    this.learn(exp);
    return "\nThis encounter has left you wiser +" + exp + "xp\n";
  }

  public gainGuts(weight: number): string {
    if (Tools.roll(this.getGuts()) >= weight) {
      return "";
    }
    this.addGuts(1);
    return "\n*** You grow Stronger  +1 Guts! ***\n";
  }

  public gainWits(weight: number): string {
    if (Tools.roll(this.getWits()) >= weight) {
      return "";
    }
    this.addWits(1);
    return "\n*** You grow Smarter  +1 Wits! ***\n";
  }

  public gainCharm(weight: number): string {
    if (Tools.roll(this.getCharm()) >= weight) {
      return "";
    }
    this.addCharm(1);
    return "\n*** You grow Happier  +1 Charm! ***\n";
  }

  public learn(num: number): number {
    return this.getStatus().add(Constants.EXP, num);
  }

  public getExp(): number {
    return this.getStatus().getCount(Constants.EXP);
  }

  public getRaise(): number {
    return this.raise;
  }

  public getBaseQuests(): number {
    return this.hasTrait(Constants.QUICK) ? 27 + 4 * this.getLevel() : 27 + 3 * this.getLevel();
  }

  public getQuests(): number {
    return this.getBaseQuests() - this.getFatigue() - this.getOverload();
  }

  public getFatigue(): number {
    return this.getTemp().getCount(Constants.FATIGUE);
  }

  public getOverload(): number {
    const max = this.packMax();
    const size = this.getPack().getCount();
    if (size > max) {
      return size - max;
    }
    return 0;
  }

  public addFatigue(num: number): number {
    return this.getTemp().add(Constants.FATIGUE, num);
  }

  public subFatigue(num: number): number {
    return this.getTemp().sub(Constants.FATIGUE, num);
  }

  public getSocial(): number {
    let rank = this.getRank().getCount(Constants.SOCIAL);
    if (rank < 2) {
      rank = 2;
    }
    return rank;
  }

  public getTitle(): string {
    return Constants.rankTitle[this.getSocial()];
  }

  public getRankTitle(): string {
    return Constants.rankName[this.getGender()][this.getSocial()];
  }

  public getFullTitle(): string {
    return this.getRankTitle() + " " + this.getName();
  }

  public getGender(): number {
    return Constants.FEMALE === this.looks.getValue(Constants.TITLE) ? 1 : 0;
  }

  public getFame(): number {
    return this.getStatus().getCount(Constants.FAME);
  }

  public getAge(): number {
    return this.getStatus().getCount(Constants.AGE);
  }

  public isNewday(): boolean {
    return this.lastPlay !== null && this.lastPlay !== Tools.getToday();
  }

  public getFavor(): number {
    return this.getStatus().getCount(Constants.FAVOR);
  }

  public addFavor(add: number): void {
    if (this.getFavor() + add >= 0) {
      this.getStatus().add(Constants.FAVOR, add);
    }
  }

  public subFavor(sub: number): void {
    if (sub > this.getFavor()) {
      this.getStatus().zero(Constants.FAVOR);
    } else {
      this.getStatus().sub(Constants.FAVOR, sub);
    }
  }

  public searchWork(val: number): void {
    if (this.hasTrait(Constants.RANGER)) {
      this.addFatigue(Tools.roll(1 + val));
    } else {
      this.addFatigue(val);
    }
  }

  public travelWork(val: number): void {
    if (this.hasTrait(Constants.GYPSY)) {
      this.addFatigue(Tools.roll(1 + val));
    } else {
      this.addFatigue(val);
    }
  }

  public actCount(): number {
    return this.getTemp().getCount(Constants.ACTIONS);
  }

  /** Java: `act()` and `act(int)` overloads. */
  public act(num?: number): boolean {
    const val = num === undefined ? 1 : num;
    return this.getTemp().sub(Constants.ACTIONS, val) === val;
  }

  public resetActions(): void {
    if (this.hasTrait("Blind")) {
      this.getTemp().zero(Constants.ACTIONS);
    } else {
      this.getTemp().fix(
        Constants.ACTIONS,
        1 + Math.trunc(this.fightRank() / 4) + Math.trunc(this.thiefRank() / 5) + Math.trunc(this.magicRank() / 6),
      );
    }
    this.getActions().clrQueue();
    this.getActions().setName(Constants.ATTACK);
    this.setState(itAgent.ALIVE);
  }

  public packMax(): number {
    return 60 + (this.hasTrait(Constants.TRADER) ? 20 : 0) + (this.hasTrait(Constants.MERCHANT) ? 20 : 0);
  }

  public storeMax(): number {
    return 100 + (this.hasTrait(Constants.HOTEL) ? 50 : 0);
  }

  public holdMax(): number {
    return 100 + (this.hasTrait(Constants.TRADER) ? 50 : 0) + (this.hasTrait(Constants.MERCHANT) ? 100 : 0);
  }

  public heroHas(it: Item): number {
    return this.packCount(it) + this.getStore().getCount(it);
  }

  public override packHeal(): number {
    return (
      this.packCount(GearTypes.APPLE) + this.packCount(GearTypes.TROLL) + this.packCount(GearTypes.SALVE)
    );
  }

  public override packMagic(): number {
    return (
      this.packCount(GearTypes.BLIND_DUST) +
      this.packCount(GearTypes.PANIC_DUST) +
      this.packCount(GearTypes.BLAST_DUST)
    );
  }

  public getClan(): string | null {
    const clan = this.getRank().getValue(Constants.CLAN);
    if (clan !== null && clan.length >= 1) {
      return clan;
    }
    return null;
  }

  public setClan(clan: string | null): void {
    this.getRank().drop(Constants.CLAN);
    if (clan !== null) {
      this.getRank().append(Constants.CLAN, clan);
    }
  }

  public picture(): Portrait {
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

  public doGrant(it: itNote): string {
    const newClan = it.getFrom();
    const oldClan = this.getClan();
    this.getPack().drop(it);
    if (oldClan === null || oldClan.length <= 0 || equalsIgnoreCase(Constants.NONE, oldClan)) {
      const msg = new MadLib(clanMsg);
      msg.replace("$clan$", newClan as string);
      msg.append(this.gainGuts(5));
      msg.append(this.gainWits(5));
      msg.append(this.gainCharm(5));
      this.setClan(newClan);
      return msg.getText();
    }
    this.getTemp().fixTrait("Blind");
    this.addWounds(Math.trunc((this.getGuts() - this.getWounds()) / 2));
    const msg2 = new MadLib(flameMsg);
    msg2.append(this.gainExp(this.getLevel()));
    return msg2.getText();
  }

  public tryToLevel(from: Screen): boolean {
    if (!this.isDead()) {
      this.setState(itAgent.ALIVE);
    }
    if (this.getExp() < this.getRaise()) {
      return false;
    }
    this.getRank().add(Constants.LEVEL, 1);
    this.getStatus().sub(Constants.EXP, this.getRaise());
    this.calcRaise();
    this.addGuts(2);
    this.addWits(2);
    this.addCharm(2);
    this.getStatus().add(Constants.FAME, this.getLevel());
    Tools.setRegion(
      new arNotice(
        from,
        "CONGRATUALATIONS!!!!\nYour hours and minutes of sweat and suffering have finally been rewarded by an epiphany of understanding.\n\n+++ You Have Gained A Level - Level " +
          this.getLevel() +
          "+++\n" +
          "*** You Have Grown Stronger  +2 Guts ***\n" +
          "*** You Have Grown Smarter  +2 Wits ***\n" +
          "*** You Have Grown Happier  +2 Charm ***\n" +
          "+++ You Have Grown Tougher  +3 Quests +++\n",
      ),
    );
    return true;
  }

  public killedScreen(from: Screen, tale: string | null, losePack: boolean): Screen {
    let msg: string;
    const cost = Math.trunc(this.getBaseQuests() / 4);
    let msg2 = tale;
    if (this.getPack().getCount("Bottled Faery") > 0) {
      msg =
        msg2 === null
          ? "\tYou are wounded mortally and fall to the ground.  Before the creature can act, a Bottled Faery breaks free from your pack and transports you the monastery.  It clucks at you briefly in admonishment, then flies away leaving a trail of sparkly dust.\n"
          : msg2.concat(
              "\n\tA Bottled Faery breaks free from your pack and transports you to the healers!",
            );
      this.subPack("Bottled Faery", 1);
    } else {
      if (msg2 === null) {
        msg2 =
          "\tYou are wounded mortally and fall to the ground.  The creature roots through your pack and leaves you for dead.  A friendly woodsman finds you before the last of your blood has fallen.  He drags you to the healers where your life is sustained by a thread.\n";
      }
      this.setState(itAgent.DEAD);
      this.addFatigue(cost);
      this.getStatus().fix(Constants.FAME, Math.trunc((this.getStatus().getCount(Constants.FAME) * 9) / 10));
      if (losePack) {
        msg2 = msg2.concat("\n\t*** Half your equipment is lost. ***\n");
        this.getPack().loseHalf();
      }
      if (this.getQuests() < 1) {
        return new arExit(from, this.getPlace() as string);
      }
      msg = msg2.concat("\n\t\t*** You lose " + cost + " quests. ***\n");
    }
    this.getTemp().fix(Constants.WOUNDS, this.getGuts() - Math.trunc(this.getGuts() / this.getLevel()));
    this.doCure();
    this.setState(itAgent.ALIVE);
    this.setPlace(Constants.FIELDS);
    Screen.saveHero();
    return new arNotice(new arHealer(new arField()), msg);
  }
}

// Java's `Item.factory` dispatches both `{itHero|` and `{itAgent|` to itHero.factory.
Item.registerFactory(["{itAgent|", "{itHero|"], (buf: Buffer): Item | null => itHero.factory(buf));
