/**
 * Compatibility module for `DCourt.Screens.Quest.Options`.
 *
 * Java declared `Options` as a `java.awt.Canvas` subclass inside the Quest
 * package because arQuest/arBattle were its only users.  The DOM port of that
 * widget lives in `DCourt/ui/options.ts` (one row per option, `fire()` instead
 * of AWT events).  This module re-exports it under the Quest package path so
 * ported screens can keep the Java import and the Java constant names:
 *
 *   import { Options, BRIBE, BACKSTAB, SPELLS } from "./Options";
 *
 * The numbers below are the `static final int`s of the Java class; they are
 * also the values stored in the option list, which is why `applyChoice` in
 * arQuest can switch on them.  Note the coincidence the Java source relies on:
 * the effect-type numbers in `GearTypes` (EFF_AGING = 12 ... EFF_BLESS = 16)
 * are the same numbers as RUNAWAY / CARP / BUSHIDO / CAPTURE / SPELLS, so Java
 * wrote `case GearTypes.EFF_AGING:` where it meant option 12 ("flee").
 */

export { Options, options } from "../../ui/options";

/** Java `Options.BRIBE` - pay the monster off with Marks. */
export const BRIBE = 0;

/** Java `Options.FEED` - hand over `GearTypes.FOOD`. */
export const FEED = 1;

/** Java `Options.RIDDLE` - answer the monster's riddle. */
export const RIDDLE = 2;

/** Java `Options.TRADE` - buy the monster's pack. */
export const TRADE = 3;

/** Java `Options.HELP` - fix whatever the monster is struggling with. */
export const HELP = 4;

/** Java `Options.SEDUCE` - charm the monster out of its gear. */
export const SEDUCE = 5;

/** Java `Options.CONTROL` - Hypnotize (hero needs `magic`). */
export const CONTROL = 6;

/** Java `Options.BACKSTAB` - requires `thief`. */
export const BACKSTAB = 7;

/** Java `Options.BERZERK` - requires `fight`. */
export const BERZERK = 8;

/** Java `Options.SWINDLE` - the thief-side counterpart of Hypnotize. */
export const SWINDLE = 9;

/** Java `Options.IEATSU` - samurai training attack. */
export const IEATSU = 10;

/** Java `Options.ATTACK` - the plain physical attack. */
export const ATTACK = 11;

/** Java `Options.RUNAWAY` (also `GearTypes.EFF_AGING`). */
export const RUNAWAY = 12;

/** Java `Options.CARP` (also `GearTypes.EFF_FACELESS`) - feed it Fish. */
export const CARP = 13;

/** Java `Options.BUSHIDO` (also `GearTypes.EFF_SCRIBE`) - present a Token. */
export const BUSHIDO = 14;

/** Java `Options.CAPTURE` (also `GearTypes.EFF_GLOW`) - bottle the faery. */
export const CAPTURE = 15;

/** Java `Options.SPELLS` (also `GearTypes.EFF_BLESS`) - magic assault. */
export const SPELLS = 16;

/**
 * Java `Options.OPT_ARRAY` - option number -> the name stored in the monster's
 * `opts` list.  `fixList()` matched those names against the monster data.
 */
export const OPT_ARRAY: readonly string[] = [
  "bribe",
  "feed",
  "riddle",
  "trade",
  "help",
  "seduce",
  "control",
  "backstab",
  "berzerk",
  "swindle",
  "ieatsu",
  "attack",
  "flee",
  "fish",
  "bushido",
  "capture",
];
