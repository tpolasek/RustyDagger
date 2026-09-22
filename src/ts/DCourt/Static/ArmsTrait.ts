/*
 * Ported from DCourt/Static/ArmsTrait.java (Java interface ArmsTrait).
 * `traitList` is a Java `itList` of `itToken`s; see StaticList.ts for why it is
 * built with StaticList here. `Tools.DEFAULT_HEIGHT` is inlined (see below).
 */

import { StaticList } from './StaticList';

/**
 * Java `Tools.DEFAULT_HEIGHT` (DCourt/Tools/Tools.java:47). Inlined so the static
 * data has no compile-time dependency on the Tools module (not ported yet).
 */
const DEFAULT_HEIGHT: number = 300;

export const HEAD: string = "Head";

export const BODY: string = "Body";

export const RIGHT: string = "Right";

export const LEFT: string = "Left";

export const FEET: string = "Feet";

export const SECRET: string = "Secret";

export const DECAY: string = "Decay";

export const CURSED: string = "Cursed";

export const CURSE: string = "Curse";

export const GLOWS: string = "Glows";

export const FLAME: string = "Flame";

export const BLESS: string = "Bless";

export const LUCKY: string = "Lucky";

export const DISEASE: string = "Disease";

export const BLIND: string = "Blind";

export const PANIC: string = "Panic";

export const BLAST: string = "Blast";

export const ENCHANT: string = "Enchant";

export const traitLabel: string[] = [
  HEAD, BODY, FEET, RIGHT, LEFT, DECAY, SECRET, CURSED, CURSE, GLOWS, FLAME, BLESS, LUCKY,
  "Disease", "Blind", "Panic", BLAST, ENCHANT
];

export const traitList: StaticList = new StaticList("Traits", traitLabel);

export const VISIBLE_TRAIT: number = traitList.firstOf(CURSE);

export const RANDOM_TRAIT: number = traitList.firstOf(CURSED);

export const VALUED_TRAIT: number = traitList.firstOf(GLOWS);

export const END_WEAR_TRAIT: number = traitList.firstOf(LEFT) + 1;

export const ENCHANT_TRAIT: number = traitList.firstOf(ENCHANT);

export const MAX_TRAITS: number = traitLabel.length;

export const traitValue: number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 800, DEFAULT_HEIGHT, 250, 1500, 4000, 3000, 2000, 100
];

/**
 * All of the above in one object, mirroring the Java interface members
 * (e.g. `ArmsTrait.HEAD`).
 */
export const ArmsTrait = {
  HEAD, BODY, RIGHT, LEFT, FEET, SECRET, DECAY, CURSED, CURSE, GLOWS, FLAME, BLESS,
  LUCKY, DISEASE, BLIND, PANIC, BLAST, ENCHANT, traitLabel, traitList, VISIBLE_TRAIT,
  RANDOM_TRAIT, VALUED_TRAIT, END_WEAR_TRAIT, ENCHANT_TRAIT, MAX_TRAITS, traitValue
};

// Compile-time guard: every named export above must appear in the object below.
const _allExports: Omit<typeof import('./ArmsTrait'), 'ArmsTrait'> = ArmsTrait;
void _allExports;
