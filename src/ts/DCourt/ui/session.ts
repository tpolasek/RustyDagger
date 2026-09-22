/**
 * Game-session bridges.
 *
 * Java kept the mutable game state as statics on `Tools`/`Player`/`Screen`
 * (`Tools.player`, `Tools.places`, `Tools.getHero()`, ...).  In the TS port
 * those implementations live in `DCourt/Control` and `DCourt/Items`, which are
 * ported in later phases.  To keep `ui/` free of imports into those modules
 * (and therefore free of cycles) the UI reads and writes the session through
 * this small registry, and `DCourt/Tools/Tools.ts` re-exposes it with the
 * original Java names.
 *
 * Phase 2/5 wiring code calls the setters here (or the equivalent
 * `Tools.setPlayer` / `Tools.setPlaceTable` / ... wrappers):
 *
 *   setPlayer(new Player());          // Control/Player.ts
 *   setGearTable(GearTable);          // Control/GearTable.ts
 *   setMonsterTable(MonsterTable);    // Control/MonsterTable.ts
 *   setStatusScreenFactory((from) => new arStatus(from));   // Screens/Utility
 *   setRankingsLoader((who) => Loader.cgiBuffer(Loader.READRANK, who));
 */

import type { Screen } from "./screen";
import type { StatusPic } from "./statusPic";

/**
 * Structural, deliberately permissive view of a game object.
 *
 * The concrete `itHero` / `Player` / `itList` implementations arrive in later
 * phases; typing these seams loosely keeps every screen port compiling against
 * whatever shape those classes end up with, while call sites still read the
 * Java names (`hero.getGuts()`, `list.select(ix)`, ...).
 */
export interface Loose {
  [key: string]: any;
}

/** `DCourt.Items.List.itHero` (or `itAgent`/`itMonster`). */
export type HeroLike = Loose;
/** `DCourt.Control.Player`. */
export type PlayerLike = Loose;
/** `DCourt.Items.Item`. */
export type ItemLike = Loose;
/** `DCourt.Items.itList`. */
export type ListLike = Loose;
/** `DCourt.Control.PlaceTable`. */
export type PlaceTableLike = Loose;
/** `DCourt.Control.MonsterTable`. */
export type MonsterTableLike = Loose;
/** `DCourt.Control.GearTable` / `ArmsTable` (static helper tables). */
export type TableLike = Loose;
/** `DCourt.Tools.Buffer` (used for the ranking file). */
export type BufferLike = Loose;

let player: PlayerLike | null = null;
let directHero: HeroLike | null = null;
let places: PlaceTableLike | null = null;
let monsters: MonsterTableLike | null = null;
let gear: TableLike | null = null;
let statusPic: StatusPic | null = null;
let today = "";
let playtest = false;
let config = "DCourt";
let cgibin = "";

/* ---------------------------------------------------------------- player */

/** Register the loaded `Player` (Control/Player.ts). */
export function setPlayer(next: PlayerLike | null): void {
  player = next;
}

/** `Tools.getPlayer()`. */
export function getPlayer(): PlayerLike | null {
  return player;
}

/**
 * `Tools.getHero()` - `player.getHero()`, or the value handed to `setHero`
 * when no player is installed (test harnesses and single-screen bootstraps).
 */
export function getHero(): HeroLike | null {
  if (player) {
    const hero = player.getHero();
    return hero === undefined ? null : (hero as HeroLike | null);
  }
  return directHero;
}

/** Escape hatch: set the active hero without a Player instance. */
export function setHero(hero: HeroLike | null): void {
  directHero = hero;
}

/** `Screen.getBest()` / `Tools.getBest()`. */
export function getBest(): string {
  const p = getPlayer();
  return p ? String(p.getBest()) : "none";
}

/** `Screen.getLeader()`. */
export function getLeader(): string {
  const p = getPlayer();
  return p ? String(p.getLeader()) : "none";
}

/** `Screen.getSessionID()`. */
export function getSessionID(): number {
  const p = getPlayer();
  return p ? Number(p.getSessionID()) : 0;
}

/** `Screen.tryToExit(where, loc, cost)`; returns null when nothing is loaded. */
export function tryToExit(where: unknown, loc: string, cost: number): Screen | null {
  const p = getPlayer();
  if (!p) return null;
  const next = p.tryToExit(where, loc, cost);
  return (next ?? null) as Screen | null;
}

/** `Screen.saveHero()`. */
export function saveHero(): boolean {
  const p = getPlayer();
  return p ? Boolean(p.saveHero()) : false;
}

/* ----------------------------------------------------------- data tables */

/** Register `Control/PlaceTable` (used by `Tools.getPlaceTable`). */
export function setPlaceTable(table: PlaceTableLike | null): void {
  places = table;
}

/** `Tools.getPlaceTable()`. */
export function getPlaceTable(): PlaceTableLike | null {
  return places;
}

/** Register `Control/MonsterTable` (used by `Screen.findBeast`). */
export function setMonsterTable(table: MonsterTableLike | null): void {
  monsters = table;
}

/** `MonsterTable.find(key)`. */
export function findMonster(key: string): ItemLike | null {
  if (!monsters) return null;
  const it = monsters.find(key);
  return (it ?? null) as ItemLike | null;
}

/** Register `Control/GearTable` (used by `Screen.addPack`/`putPack` guards). */
export function setGearTable(table: TableLike | null): void {
  gear = table;
}

/** `GearTable.find(idOrItem)`; permissive until the table is registered. */
export function gearFind(idOrItem: unknown): boolean {
  if (!gear) return true;
  return Boolean(gear.find(idOrItem));
}

/* -------------------------------------------------------- status strip */

/** Register the shared status strip (`Tools.statusPic` in Java). */
export function setStatusPic(pic: StatusPic | null): void {
  statusPic = pic;
}

/** The shared status strip, or null before `ensureStatusPic()` runs. */
export function getStatusPic(): StatusPic | null {
  return statusPic;
}

/* --------------------------------------------------------- misc globals */

/** `Tools.getToday()` / `setToday()`. */
export function getToday(): string {
  return today;
}

export function setToday(value: string): void {
  today = value;
}

/** `Tools.getConfig()` (DCourtApplet's CONFIG parameter). */
export function getConfig(): string {
  return config;
}

export function setConfig(value: string): void {
  config = value;
  playtest = value.toUpperCase() === "DCOURTWORK";
}

/** `Tools.getCgibin()` - unused while the network layer is stubbed. */
export function getCgibin(): string {
  return cgibin;
}

export function setCgibin(value: string): void {
  cgibin = value;
}

/** `Tools.isPlaytest()`. */
export function isPlaytest(): boolean {
  return playtest;
}

export function setPlaytest(value: boolean): void {
  playtest = value;
}

/* --------------------------------------------------------------- hooks */

let statusScreenFactory: ((from: Screen) => Screen) | null = null;

/**
 * Phase 5 registers `(from) => new arStatus(from)` here so `Screen.action` can
 * open the hero status screen without the base class importing a screen.
 */
export function setStatusScreenFactory(factory: ((from: Screen) => Screen) | null): void {
  statusScreenFactory = factory;
}

/** Build the status screen for `from`, or null when nothing is registered. */
export function openStatusScreen(from: Screen): Screen | null {
  return statusScreenFactory ? statusScreenFactory(from) : null;
}

let rankingsLoader: ((who: string) => BufferLike | null) | null = null;

/** Phase 2 registers `(who) => Loader.cgiBuffer(Loader.READRANK, who)`. */
export function setRankingsLoader(loader: ((who: string) => BufferLike | null) | null): void {
  rankingsLoader = loader;
}

/** Fetch the ranking buffer for a hero name (`Tools.getRankings`). */
export function loadRankings(who: string): BufferLike | null {
  return rankingsLoader ? rankingsLoader(who) : null;
}
