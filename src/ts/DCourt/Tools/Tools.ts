/**
 * Tools - the browser port of `DCourt.Tools.Tools`.
 *
 * Java kept the applet handle, the RNG, the image cache, the font slots and the
 * region navigation as statics on this class.  The TS port splits that work
 * across `DCourt/ui/*` (stage, resources, session, dom) and exposes it here
 * under the original Java names so ported screens keep compiling as they did:
 *
 *   Tools.roll(10) / Tools.contest(a, b) / Tools.percent(25)
 *   Tools.loadImage("Faces/Hero.jpg")
 *   Tools.setRegion(new arTown())
 *   Tools.getHero() / Tools.getPlayer() / Tools.getPlaceTable()
 *   Tools.courtF / Tools.textF / Tools.DEFAULT_WIDTH
 *   Tools.statusPic
 *   Tools.getToday() / Tools.detokenize(msg) / Tools.truncate(id)
 *
 * Both import styles work:
 *   import { Tools } from "../Tools/Tools";   Tools.roll(4)
 *   import * as Tools from "../Tools/Tools";  Tools.roll(4)
 *
 * Dropped from Java: `chooseFont`/`fixJvmVersion`/`getJvmVersion` (the CSS font
 * classes replace AWT font probing) and `isLoading(stage)` (Phase 4 turns the
 * stage machine into an async sequence - use `Tools.preload*`).
 *
 * `Tools` must never import a concrete screen; screens import Tools.
 */

import { type FontName } from "../ui/dom";
import * as resources from "../ui/resources";
import * as session from "../ui/session";
import { ensureStatusPic as createStatusPic } from "../ui/statusPic";
import {
  type Stage,
  getRegion as stageGetRegion,
  getStage as stageGetStage,
  installStage,
  movedAway as stageMovedAway,
  repaintRegion,
  setRegion as stageSetRegion,
} from "../ui/stage";
import type { Screen } from "../ui/screen";
import type { StatusPic } from "../ui/statusPic";
import type {
  BufferLike,
  HeroLike,
  ItemLike,
  ListLike,
  MonsterTableLike,
  PlaceTableLike,
  PlayerLike,
  TableLike,
} from "../ui/session";

/** Thin `System.out.println` stand-in (plan: log to the console). */
export function log(...args: unknown[]): void {
  console.log("[DCourt]", ...args);
}

/** Thin `System.err.println` stand-in. */
export function logError(...args: unknown[]): void {
  console.error("[DCourt]", ...args);
}

export class Tools {
  /** Java `Tools.DEFAULT_WIDTH` / `DEFAULT_HEIGHT`. */
  static readonly DEFAULT_WIDTH = 400;
  static readonly DEFAULT_HEIGHT = 300;

  /* ------------------------------------------------------------- fonts */

  /** Font slots; the actual faces come from the classes in styles.css. */
  static readonly courtF: FontName = "courtF";
  static readonly questF: FontName = "questF";
  static readonly statusF: FontName = "statusF";
  static readonly fightF: FontName = "fightF";
  static readonly fieldF: FontName = "fieldF";
  static readonly boldF: FontName = "boldF";
  static readonly textF: FontName = "textF";
  static readonly bigF: FontName = "bigF";
  static readonly giantF: FontName = "giantF";

  /** Java chose a font family at runtime; CSS owns that decision now. */
  static primeFont: string | null = null;

  /** Java `Tools.prepareFonts()` - a no-op: the slots above are constants. */
  static prepareFonts(): void {}

  /* --------------------------------------------------------------- RNG */

  private static seeded: (() => number) | null = null;

  /**
   * Java `Tools.setSeed(int)` reseeded `java.util.Random`.  The port uses a
   * seeded generator only when a seed is requested (pass 0 to go back to
   * `Math.random`), which keeps deterministic testing possible.
   */
  static setSeed(val: number): void {
    Tools.seeded = val === 0 ? null : mulberry32(val);
  }

  /** Java `Random.nextInt()`; 32 bit, signed. */
  static nextInt(): number {
    if (Tools.seeded) return Math.floor(Tools.seeded() * 2 ** 32) | 0;
    return Math.floor(Math.random() * 2 ** 32) | 0;
  }

  /** Java `Tools.roll(int)`: `abs(nextInt()) % value`, 0 for value < 1. */
  static roll(value: number): number {
    if (value < 1) return 0;
    let num = Tools.nextInt();
    if (num < 0) num = -num;
    return num % value;
  }

  /** Java `Tools.twice(int)`. */
  static twice(value: number): number {
    return Tools.roll(value) + Tools.roll(value);
  }

  /** Java `Tools.contest(int, int)`. */
  static contest(a: number, b: number): boolean {
    return Tools.roll(a + b) < a;
  }

  /** Java `Tools.percent(int)` (the `percent(String)` overload is folded in). */
  static percent(value: number | string): boolean {
    const num = typeof value === "string" ? Number.parseInt(value, 10) : value;
    if (!Number.isFinite(num)) {
      logError("percent(): bad value", value);
      return false;
    }
    return Tools.roll(100) < num;
  }

  /** Java `Tools.chance(int)`. */
  static chance(value: number): boolean {
    return Tools.roll(value) === 0;
  }

  /** Java `Tools.select(String[])`. */
  static select(list: readonly string[]): string {
    return list[Tools.roll(list.length)] ?? "";
  }

  /** Java `Tools.fourTest(int, int)`: four contests, returns the wins. */
  static fourTest(a: number, b: number): number {
    const test = a + b;
    let num = 0;
    if (Tools.roll(test) < a) num++;
    if (Tools.roll(test) < a) num++;
    if (Tools.roll(test) < a) num++;
    if (Tools.roll(test) < a) num++;
    return num;
  }

  /** Java `Tools.spread(int)`. */
  static spread(value: number): number {
    const min = Math.trunc((value * 5) / 7);
    return 1 + min + Tools.twice(value - min);
  }

  /** Java `Tools.skew(int)`: how many chained percent rolls succeed. */
  static skew(value: number): number {
    let sum = 0;
    while (Tools.percent(value)) sum++;
    return sum;
  }

  /* ----------------------------------------------------------- strings */

  /** Java `Tools.truncate(String)`: cut at `[` or at the `$` token. */
  static truncate(id: string | null): string | null {
    if (id === null) return null;
    const ix = id.indexOf("[");
    if (ix > 0) return id.substring(0, ix);
    const ix2 = id.indexOf("$");
    return ix2 < 1 ? id : id.substring(0, ix2 - 1);
  }

  /** Java `Tools.detokenize(String)`: `{`->`(`, `|`->`:`, `}`->`)`. */
  static detokenize(msg: string): string {
    return msg.replaceAll("{", "(").replaceAll("|", ":").replaceAll("}", ")");
  }

  /* ------------------------------------------------------ region / nav */

  /** Java `Tools.setRegion(Screen)`. */
  static setRegion(next: Screen | null): void {
    stageSetRegion(next);
  }

  /** Java `Tools.getRegion()`. */
  static getRegion(): Screen | null {
    return stageGetRegion();
  }

  /** Java `Tools.movedAway(Screen)`. */
  static movedAway(test: unknown): boolean {
    return stageMovedAway(test);
  }

  /** Java `Tools.repaint()`. */
  static repaint(): void {
    repaintRegion();
  }

  /** Install the `#stage` element (Phase 4 calls this from main.ts). */
  static installStage(el?: HTMLElement | string | null): void {
    installStage(el);
  }

  /** The installed stage, or null before boot. */
  static getStage(): Stage | null {
    return stageGetStage();
  }

  /* ------------------------------------------------------- date / conf */

  /** Java `Tools.getToday()`. */
  static getToday(): string {
    return session.getToday();
  }

  /** Java `Tools.setToday(String)`. */
  static setToday(val: string): void {
    session.setToday(val);
  }

  /** Java `Tools.isPlaytest()`. */
  static isPlaytest(): boolean {
    return session.isPlaytest();
  }

  /** Java `Tools.setPlaytest(boolean)` (DCourtApplet had this too). */
  static setPlaytest(val: boolean): void {
    session.setPlaytest(val);
  }

  /** Java `Tools.getConfig()`. */
  static getConfig(): string {
    return session.getConfig();
  }

  /** DCourtApplet's CONFIG parameter; also derives the playtest flag. */
  static setConfig(val: string): void {
    session.setConfig(val);
  }

  /** Java `Tools.getCgibin()`. */
  static getCgibin(): string {
    return session.getCgibin();
  }

  /** DCourtApplet's CGIBIN parameter. */
  static setCgibin(val: string): void {
    session.setCgibin(val);
  }

  /* ------------------------------------------------- game state access */

  /** Register the Control/Player instance (Phase 2). */
  static setPlayer(player: PlayerLike | null): void {
    session.setPlayer(player);
  }

  /** Java `Tools.getPlayer()`; throws before the player is installed. */
  static getPlayer(): PlayerLike {
    return requirePlayer();
  }

  /** Nullable player access. */
  static playerOrNull(): PlayerLike | null {
    return session.getPlayer();
  }

  /** Java `Tools.getHero()`; throws when no hero is loaded. */
  static getHero(): HeroLike {
    return requireHero();
  }

  /** Nullable hero access. */
  static heroOrNull(): HeroLike | null {
    return session.getHero();
  }

  /** Set the active hero directly (tests / single screen bootstraps). */
  static setHero(hero: HeroLike | null): void {
    session.setHero(hero);
  }

  /** Java `Tools.getBest()`. */
  static getBest(): string {
    return session.getBest();
  }

  /** Java `Tools.getPlayer().getLeader()`. */
  static getLeader(): string {
    return session.getLeader();
  }

  /** Java `Tools.getPlaceTable()`. */
  static getPlaceTable(): PlaceTableLike | null {
    return session.getPlaceTable();
  }

  /** Register Control/PlaceTable (Phase 2). */
  static setPlaceTable(table: PlaceTableLike | null): void {
    session.setPlaceTable(table);
  }

  /** Register Control/MonsterTable (Phase 2). */
  static setMonsterTable(table: MonsterTableLike | null): void {
    session.setMonsterTable(table);
  }

  /** Register Control/GearTable (Phase 2). */
  static setGearTable(table: TableLike | null): void {
    session.setGearTable(table);
  }

  /** Java `Tools.setHeroPlace(String)`. */
  static setHeroPlace(val: string): void {
    requireHero().setPlace(val);
  }

  /** Java `Tools.getHeroPlace()`. */
  static getHeroPlace(): string {
    return String(requireHero().getPlace());
  }

  /** Java `Tools.setHeroState(String)`. */
  static setHeroState(val: string): void {
    requireHero().setState(val);
  }

  /** Java `Tools.getHeroState()`. */
  static getHeroState(): string {
    return String(requireHero().getState());
  }

  /* ------------------------------------------------------ status strip */

  /** Java `Tools.statusPic` (created by `ensureStatusPic`). */
  static get statusPic(): StatusPic | null {
    return session.getStatusPic();
  }

  static set statusPic(pic: StatusPic | null) {
    session.setStatusPic(pic);
  }

  /** Create the shared status strip if it does not exist yet. */
  static ensureStatusPic(): StatusPic {
    return createStatusPic();
  }

  /** Phase 5 hook: `(from) => new arStatus(from)` for status-strip clicks. */
  static setStatusScreenFactory(factory: ((from: Screen) => Screen) | null): void {
    session.setStatusScreenFactory(factory);
  }

  /** Phase 2 hook: `(who) => Loader.cgiBuffer(Loader.READRANK, who)`. */
  static setRankingsLoader(loader: ((who: string) => BufferLike | null) | null): void {
    session.setRankingsLoader(loader);
  }

  /* ----------------------------------------------------------- ranking */

  private static ranks: BufferLike | null = null;
  private static lastWho = "not";

  /**
   * Java `Tools.getRankings()`: the ranking file is cached until the hero
   * name changes, then handed back rewound.
   */
  static getRankings(): BufferLike | null {
    const hero = session.getHero();
    const who = hero === null || hero === undefined ? "not" : String(hero.getName());
    if (Tools.ranks === null || Tools.lastWho.toUpperCase() !== who.toUpperCase()) {
      Tools.ranks = session.loadRankings(who);
    }
    Tools.lastWho = who;
    if (Tools.ranks === null) return null;
    Tools.ranks.reset();
    return Tools.ranks;
  }

  /* --------------------------------------------------------- resources */

  /** Java `Tools.loadImage(String)`. */
  static loadImage(path: string | null | undefined): HTMLImageElement | null {
    return resources.loadImage(path);
  }

  /** Java `Tools.storeResource(String, Object)`. */
  static storeResource(path: string, item: unknown): void {
    resources.storeResource(path, item);
  }

  /** Java `Tools.findResource(String)`. */
  static findResource<T = unknown>(path: string): T | null {
    return resources.findResource<T>(path);
  }

  /** Java `Tools.replaceResource(String, Object)`. */
  static replaceResource(path: string, item: unknown): void {
    resources.replaceResource(path, item);
  }

  /** Java `Tools.dropDocumentResources()`. */
  static dropDocumentResources(): void {
    resources.dropDocumentResources();
  }

  /** The art root (Java's `DCourtApplet.artpath`; default "Images"). */
  static getArtpath(): string {
    return resources.getArtpath();
  }

  static setArtpath(path: string): void {
    resources.setArtpath(path);
  }

  /** Await a single image; Phase 4's loading sequence uses this. */
  static preload(path: string): Promise<HTMLImageElement | null> {
    return resources.preload(path);
  }

  /** Await a batch of images (resolves when all have loaded or failed). */
  static preloadAll(paths: readonly string[]): Promise<void> {
    return resources.preloadAll(paths);
  }

  /** Forget every cached image (tests). */
  static clearResources(): void {
    resources.clearResources();
  }
}

/** `Tools.getHero()` as a free function. */
export function requireHero(): HeroLike {
  const hero = session.getHero();
  if (!hero) throw new Error("Tools.getHero(): no hero is loaded");
  return hero;
}

/** `Tools.getPlayer()` as a free function. */
export function requirePlayer(): PlayerLike {
  const player = session.getPlayer();
  if (!player) throw new Error("Tools.getPlayer(): no player is loaded");
  return player;
}

/* ------------------------------------------------------------------------
 * Module level mirrors.
 *
 * `import * as Tools from "./Tools"` gives the same call shapes as the Java
 * static methods, so either import style works in ported screens.
 * ---------------------------------------------------------------------- */

export const DEFAULT_WIDTH = Tools.DEFAULT_WIDTH;
export const DEFAULT_HEIGHT = Tools.DEFAULT_HEIGHT;
export const courtF: FontName = Tools.courtF;
export const questF: FontName = Tools.questF;
export const statusF: FontName = Tools.statusF;
export const fightF: FontName = Tools.fightF;
export const fieldF: FontName = Tools.fieldF;
export const boldF: FontName = Tools.boldF;
export const textF: FontName = Tools.textF;
export const bigF: FontName = Tools.bigF;
export const giantF: FontName = Tools.giantF;

export const nextInt = Tools.nextInt;
export const roll = Tools.roll;
export const twice = Tools.twice;
export const contest = Tools.contest;
export const percent = Tools.percent;
export const chance = Tools.chance;
export const select = Tools.select;
export const fourTest = Tools.fourTest;
export const spread = Tools.spread;
export const skew = Tools.skew;
export const setSeed = Tools.setSeed;
export const truncate = Tools.truncate;
export const detokenize = Tools.detokenize;

export const prepareFonts = Tools.prepareFonts;
export const setRegion = Tools.setRegion;
export const getRegion = Tools.getRegion;
export const movedAway = Tools.movedAway;
export const repaint = Tools.repaint;
export const getToday = Tools.getToday;
export const setToday = Tools.setToday;
export const isPlaytest = Tools.isPlaytest;
export const getConfig = Tools.getConfig;
export const getCgibin = Tools.getCgibin;
export const getPlayer = Tools.getPlayer;
export const getHero = Tools.getHero;
export const getBest = Tools.getBest;
export const getPlaceTable = Tools.getPlaceTable;
export const setHeroPlace = Tools.setHeroPlace;
export const getHeroPlace = Tools.getHeroPlace;
export const setHeroState = Tools.setHeroState;
export const getHeroState = Tools.getHeroState;
export const getRankings = Tools.getRankings;
export const loadImage = Tools.loadImage;
export const storeResource = Tools.storeResource;
export const findResource = Tools.findResource;
export const replaceResource = Tools.replaceResource;
export const dropDocumentResources = Tools.dropDocumentResources;
export const getArtpath = Tools.getArtpath;
export const ensureStatusPic = Tools.ensureStatusPic;
export const getStatusPic = (): StatusPic | null => session.getStatusPic();

/** Item/List aliases for call sites that mirror the Java signatures. */
export type { ItemLike, ListLike };

/* --------------------------------------------------------------- helpers */

/** Deterministic 32-bit PRNG used only when `setSeed` is called. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
