/*
 * Ported from DCourt/Static/GearTypes.java (Java interface GearTypes).
 */

export const TYPE_JUNK: number = 0;

export const TYPE_MAP: number = 1;

export const TYPE_CAMP: number = 2;

export const TYPE_SUPPLY: number = 3;

export const TYPE_LOOT: number = 4;

export const TYPE_GEMS: number = 5;

export const TYPE_POTION: number = 6;

export const TYPE_SCROLL: number = 7;

export const TYPE_SPECIAL: number = 8;

export const TYPE_MONEY: number = 9;

export const typeLabel: string[] = [
  "Junk", "Map", "Camp", "Supply", "Loot", "Gems", "Potion", "Scroll", "Special", "Money"
];

export const EFF_NONE: number = 0;

export const EFF_IDENTIFY: number = 1;

export const EFF_HEAL: number = 2;

export const EFF_CURE: number = 3;

export const EFF_BLIND: number = 4;

export const EFF_PANIC: number = 5;

export const EFF_BLAST: number = 6;

export const EFF_REVIVE: number = 7;

export const EFF_HASTE: number = 8;

export const EFF_REFRESH: number = 9;

export const EFF_COOKIE: number = 10;

export const EFF_YOUTH: number = 11;

export const EFF_AGING: number = 12;

export const EFF_FACELESS: number = 13;

export const EFF_SCRIBE: number = 14;

export const EFF_GLOW: number = 15;

export const EFF_BLESS: number = 16;

export const EFF_LUCK: number = 17;

export const EFF_FLAME: number = 18;

export const EFF_ENCHANT: number = 19;

export const EFF_GRANT: number = 20;

export const EFF_FOOD: number = 21;

export const effectLabel: string[] = [
  "none",
  "identify",
  "heal",
  "cure",
  "blind",
  "panic",
  "blast",
  "apple",
  "haste",
  "refresh",
  "cookie",
  "youth",
  "aging",
  "faceless",
  "scribe",
  "glow",
  "bless",
  "luck",
  "flame",
  "enchant",
  "grant",
  "food"
];

export const TROLL: string = "Troll Warts";

export const APPLE: string = "Golden Apple";

export const SALVE: string = "Healing Salve";

export const SELTZER: string = "Seltzer Water";

export const BLIND_DUST: string = "Blinding Dust";

export const PANIC_DUST: string = "Panic Dust";

export const BLAST_DUST: string = "Blast Powder";

export const MANDRAKE: string = "Mandrake Root";

export const GINSENG: string = "Ginseng Root";

export const BLINDED: string = "Blind";

export const PANICKY: string = "Panic";

export const FOOD: string = "Food";

export const FISH: string = "Fish";

export const TOKEN: string = "Bushido Token";

export const INSURANCE: string = "Thief Insurance";

/**
 * All of the above in one object, mirroring the Java interface members
 * (e.g. `GearTypes.TYPE_JUNK`).
 */
export const GearTypes = {
  TYPE_JUNK, TYPE_MAP, TYPE_CAMP, TYPE_SUPPLY, TYPE_LOOT, TYPE_GEMS, TYPE_POTION,
  TYPE_SCROLL, TYPE_SPECIAL, TYPE_MONEY, typeLabel, EFF_NONE, EFF_IDENTIFY, EFF_HEAL,
  EFF_CURE, EFF_BLIND, EFF_PANIC, EFF_BLAST, EFF_REVIVE, EFF_HASTE, EFF_REFRESH,
  EFF_COOKIE, EFF_YOUTH, EFF_AGING, EFF_FACELESS, EFF_SCRIBE, EFF_GLOW, EFF_BLESS,
  EFF_LUCK, EFF_FLAME, EFF_ENCHANT, EFF_GRANT, EFF_FOOD, effectLabel, TROLL, APPLE,
  SALVE, SELTZER, BLIND_DUST, PANIC_DUST, BLAST_DUST, MANDRAKE, GINSENG, BLINDED,
  PANICKY, FOOD, FISH, TOKEN, INSURANCE
};

// Compile-time guard: every named export above must appear in the object below.
const _allExports: Omit<typeof import('./GearTypes'), 'GearTypes'> = GearTypes;
void _allExports;
