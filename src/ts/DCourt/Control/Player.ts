import { Item } from '../Items/Item';
import { itAgent } from '../Items/List/itAgent';
import { itHero } from '../Items/List/itHero';
import { itList } from '../Items/itList';
import {
  ATTACK,
  CHARM,
  DEFEND,
  EXP,
  FAME,
  GUTS,
  LEVEL,
  MONEY,
  SKILL,
  WITS,
} from '../Static/Constants';
import type { Buffer } from '../Tools/Buffer';
import { FileLoader } from '../Tools/FileLoader';
import { Loader, log } from '../Tools/Loader';
import { Tools } from '../Tools/Tools';
import type { ScreenRef } from './ScreenRegistry';
import { getErrorScreen, getExitScreen, getNoticeScreen } from './ScreenRegistry';

/**
 * Screens register the three screens `Player` needs through the registration table in
 * `./ScreenRegistry` (re-exported here because this is where the requirement lives):
 *
 *   import { registerPlayerScreens } from '../Control/Player';
 *   import { arExit } from './Command/arExit';
 *   import { arNotice } from './Utility/arNotice';
 *   import { arError } from './Command/arError';
 *   registerPlayerScreens({
 *     exit: (from, loc) => new arExit(from, loc),
 *     notice: (from, msg) => new arNotice(from, msg),
 *     error: (msg) => new arError(msg),
 *   });
 */
export {
  hasErrorScreen,
  hasExitScreen,
  hasNoticeScreen,
  registerPlayerScreens,
  type PlayerScreenFactories,
} from './ScreenRegistry';

/**
 * Java `DCourt.Control.Player` (`Player.java`) - one logged-in hero: credentials, session id,
 * the `itHero` record and the load/save/error flow.
 *
 * Port notes:
 *  - `FileLoader` (localStorage-backed, ported separately) replaces the file-based loader; the
 *    calls are otherwise identical (`cgiBuffer(FINDHERO, ...)`, `loadHero`, `saveHero`, `cgi`).
 *  - Screens that Java constructed directly - `new arExit(from, loc)`, `new arNotice(from, msg)`,
 *    `new arError(msg)` - are resolved through the registration table in `./ScreenRegistry`
 *    (`getExitScreen`/`getNoticeScreen`/`getErrorScreen`). That keeps `Player` free of any direct
 *    import of a screen class, which would close the cycle
 *    `Player -> arExit -> arNotice -> Screen -> Tools -> Player`. Screens register themselves; an
 *    unregistered screen is reported on the console and yields `null` instead of a crash.
 *    (`itHero`/`itAgent` are imported as values, exactly as Java did - the hero record is not UI.)
 *  - `err`/`errMessage` are static in Java and stay static here (the error flow is shared).
 *  - `alterSessionID` bit math is 32-bit safe in JS exactly as in Java (`>>`, `<<`, `|` all
 *    truncate to signed 32-bit), so it is ported unchanged.
 */
export class Player {
  static readonly NOERR = 0;
  static readonly SERVER_NOT_RESPONDING = 1;
  static readonly SERVER_SIDE_ERROR = 2;
  static readonly BAD_RECORD = 3;

  /** Java `static int err` (`Player.java:23`). */
  static err = 0;
  /** Java `static String errMessage` (`Player.java:24`). */
  static errMessage: string | null = null;

  private powers: string | null = null;
  private leader: string | null = null;
  private best: string | null = null;
  private pass: string | null = null;
  private name: string | null = null;
  private sessionID = 0;
  private hero: itHero | null = null;
  private start = new itList('start');

  getHero(): itHero | null {
    return this.hero;
  }

  /** Java `createHero()` (`Player.java:38-42`). */
  createHero(): itHero {
    this.hero = new itHero(this.name ?? '');
    this.hero.fixLists();
    return this.hero;
  }

  getName(): string | null {
    return this.name;
  }

  getPass(): string | null {
    return this.pass;
  }

  getBest(): string | null {
    return this.best;
  }

  getLeader(): string | null {
    return this.leader;
  }

  getSessionID(): number {
    return this.sessionID;
  }

  /** Java `int alterSessionID(int sid)` (`Player.java:64-66`). */
  alterSessionID(sid: number): number {
    return ((sid >> 11) & 2097151) | ((sid << 24) & -2097152);
  }

  isDead(): boolean {
    return itAgent.DEAD === this.heroOrThrow().getState();
  }

  isAlive(): boolean {
    return itAgent.ALIVE === this.heroOrThrow().getState();
  }

  isCreate(): boolean {
    return itAgent.CREATE === this.heroOrThrow().getState();
  }

  setState(val: string): void {
    this.heroOrThrow().setState(val);
  }

  /** Java `getPlace()` (`Player.java:84-86`); `itHero.getPlace()` is nullable in both ports. */
  getPlace(): string | null {
    return this.heroOrThrow().getPlace();
  }

  setPlace(val: string): void {
    this.heroOrThrow().setPlace(val);
  }

  /** Java `needsBuild()` (`Player.java:92-97`). */
  needsBuild(): boolean {
    const hero = this.heroOrThrow();
    if (hero.getLevel() <= 5) {
      return false;
    }
    const looks = hero.getLooks();
    return looks == null || looks.getCount() < 1;
  }

  getStart(): itList {
    return this.start;
  }

  /** Java `startValues()` (`Player.java:103-114`) - snapshot of the hero's starting stats. */
  startValues(): void {
    const hero = this.heroOrThrow();
    this.start.add(GUTS, hero.getGuts());
    this.start.add(WITS, hero.getWits());
    this.start.add(CHARM, hero.getCharm());
    this.start.add(ATTACK, hero.getAttack());
    this.start.add(DEFEND, hero.getDefend());
    this.start.add(SKILL, hero.getSkill());
    this.start.add(LEVEL, hero.getLevel());
    this.start.add(EXP, hero.getExp());
    this.start.add(FAME, hero.getFame());
    this.start.add(MONEY, hero.getMoney());
  }

  /** Java `loadHero(String tname, String tpass)` (`Player.java:116-127`). */
  loadHero(tname: string, tpass: string): boolean {
    this.name = tname;
    this.pass = tpass;
    this.sessionID = Tools.nextInt();
    const msg = `${tname}|${tpass}|${this.sessionID}`;
    this.sessionID = this.alterSessionID(this.sessionID);
    if (!this.readFindValues(FileLoader.cgiBuffer(Loader.FINDHERO, msg))) {
      return false;
    }
    this.hero = null;
    return this.readHeroValues(FileLoader.loadHero(this.name ?? ''));
  }

  /**
   * Java `boolean readHeroValues(Buffer buf)` (`Player.java:129-146`).
   *
   * Java casts the factory result with `(itHero)`, which throws `ClassCastException` on a record
   * of another kind; the port keeps that by checking the instance and throwing a described error,
   * so a corrupted hero record fails loudly instead of loading a half-typed agent.
   */
  readHeroValues(buf: Buffer | null): boolean {
    log('== readHeroValues == 1/');
    Player.err = Player.SERVER_NOT_RESPONDING;
    if (buf == null || buf.isError()) {
      return false;
    }
    Player.err = Player.NOERR;
    log(`== readHeroValues == 2/ > ${buf.toString()}`);
    const made = Item.factory(buf);
    if (made != null && !(made instanceof itHero)) {
      throw new Error(`Player.readHeroValues(): not a hero record [${made.getName()}]`);
    }
    this.hero = made;
    if (this.hero == null) {
      return true;
    }
    log('== readHeroValues == 3/');
    this.hero.update(this.name ?? '', this.powers);
    this.startValues();
    log('== readHeroValues == 4/');
    return true;
  }

  /** Java `boolean readFindValues(Buffer buf)` (`Player.java:148-173`). */
  readFindValues(buf: Buffer | null): boolean {
    Player.err = Player.SERVER_NOT_RESPONDING;
    if (buf == null || buf.isEmpty()) {
      return false;
    }
    Player.err = Player.SERVER_SIDE_ERROR;
    if (buf.isError()) {
      Player.errMessage = buf.line();
      return false;
    }
    Player.err = Player.BAD_RECORD;
    Tools.setToday(buf.token());
    if (Tools.getToday() == null || !buf.split()) {
      return false;
    }
    this.best = buf.token();
    if (!buf.split()) {
      return false;
    }
    this.leader = buf.token();
    if (!buf.split()) {
      return false;
    }
    this.powers = buf.token();
    return true;
  }

  /** Java `saveHero()` (`Player.java:175-188`). */
  saveHero(): boolean {
    const hero = this.heroOrThrow();
    hero.fix('Date', Tools.getToday() ?? '');
    const buf = FileLoader.saveHero(this.name ?? '', hero.toString());
    log(`saveHero ${buf}`);
    if (!buf.isError()) {
      return true;
    }
    Player.err = Player.SERVER_SIDE_ERROR;
    Player.errMessage = buf.line();
    return false;
  }

  /** Java `saveScore()` (`Player.java:190-201`). */
  saveScore(): void {
    FileLoader.cgi(
      Loader.SAVESCORE,
      `${this.name}|${this.sessionID}\n${this.heroOrThrow().rankString()}\n`
    );
  }

  /**
   * Java `tryToExit(Screen from, String loc, int cost)` (`Player.java:203-205`). Java ignores
   * `cost` as well - `arExit` derives everything from `loc` - hence the `_` prefix.
   */
  tryToExit(from: ScreenRef | null, loc: string, _cost: number): ScreenRef | null {
    return getExitScreen(from, loc);
  }

  /** Java `errorScreen(Screen from)` (`Player.java:207-245`). */
  errorScreen(from: ScreenRef | null): ScreenRef | null {
    const msg = `Error #${Player.err} Has Occured\n`;
    switch (Player.err) {
      case Player.NOERR:
        return null;
      case Player.SERVER_NOT_RESPONDING:
        return getNoticeScreen(from, `${msg}\nServer Not Responding.\nPlease Try Again Later.`);
      case Player.SERVER_SIDE_ERROR:
        return getNoticeScreen(
          from,
          `${msg}\nServer Reports This Problem:\n${String(Player.errMessage)}`
        );
      case Player.BAD_RECORD:
        return getNoticeScreen(
          from,
          `${msg}Bad Hero Record for: ${String(this.name)}\n` +
            'If this persists, contact the game manager.'
        );
      default:
        return getErrorScreen(`Unknown Error=${Player.err}\nOkay, I'm scared...`);
    }
  }

  /**
   * Java would NPE on `this.hero.getX()` when no hero is loaded; the port throws a named error so
   * the same "use before load" bug is obvious instead of silent.
   */
  private heroOrThrow(): itHero {
    if (this.hero == null) {
      throw new Error('Player: no hero loaded');
    }
    return this.hero;
  }
}
