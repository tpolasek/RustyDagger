/*
 * Ported from DCourt/Static/GameStrings.java (Java interface GameStrings extends Constants).
 * GameStrings extends Constants in Java; that is a namespace import here.
 */

import * as Constants from './Constants';

export const creditText: string = "\tDragon Court(tm) v1.2\n\tCopyright 1997-2000 Fred's Friends, Inc.\n\tHTTP://www.FFIends.com\n\n\t\tCode+Design: Fred Haslam\n\t\tMore Code: Elden Bishop\n\t\tMore Design: Lawrence Wegner\n\t\tArtwork: Ted Galaday\n\n\tMay the Farce be with you...";

export const GOSSIP: string = "\tWhile sipping your brew you exchange lies and gossip with the locals.\n";

export const BORING: string = "\n\tNoone seems interested in you...\n";

export const SAVE_CANCEL: string = "Error while trying to save hero.\n---Action Canceled\n";

export const MAIL_CANCEL: string = "Error while trying to send mail.\n---Action Canceled\n";

export const habits: string[] = [
  "he bites his nails",
  "he sharpens his blade",
  "his left eye twitches spasmodically",
  "he picks at his armpits",
  "he chirps like a chipmuck",
  "he hums the royal anthem",
  "he fiddles with is belt buckle"
];

export const features: string[] = [
  "a wine colored birthmark",
  "a hairy mole on cheek",
  "pointy ears",
  "overly developed thighs",
  "a lazy eye",
  "a beauty mark on cheek",
  "a cleft chin",
  "one ear missing",
  "a scar on one cheek",
  "a spider tattoo",
  "a unicorn tattoo"
];

export const phrases: string[] = [
  "It's Clobberin' Time!",
  "Tally Ho!",
  "Have at Fiend!",
  "What time's da bar open?",
  "Hey babe, what's your sign?"
];

export const colors: string[] = [
  "White", "Black", "Grey", "Beige", "Brown", "Red", "Orange", "Yellow", "Green", "Blue",
  "Indigo", "Violet"
];

export const races: string[] = [
  "Human", "Goblin", "Shide", "Elf", "Orc", "Dwarf", Constants.GYPSY, "Gnome", "Troll", "Halfling"
];

export const builds: string[] = [
  "Slender", "Stocky", "Average", "Dumpy", "Fat", "Thin", "Skeletal", "Muscular", Constants.STRONG
];

export const heroHasDied: string = "Your hero has died today.\nReturn tomorrow for further quests.\n";

export const Names: string[] = [
  "Amberdrake",
  "Bellifont",
  "Carroway",
  "Delacourt",
  "Evans",
  "Ferris",
  "Golan",
  "Hardawake",
  "Insult",
  "Jasper",
  "Killingfeld",
  "Lambert",
  "MacDougal",
  "Norbert",
  "Oswald",
  "Pembroke",
  "Quail",
  "Richards",
  "Sandoval",
  "Trevor",
  "Umbert",
  "Van Hogan",
  "Walters",
  "Xavier",
  "Yolanda",
  "Zelda"
];

export const signs: string[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

export const interests: string[] = [
  "$He$ is an avid collector of butterflies.",
  "$He$ owns a stable of fine stallions.",
  "This noble is famous for $his$ wine collection.",
  "This noble is an old war hero with many decorations.",
  "This $man$ is rumored to secretly be the queens lover.",
  "This $man$ has a discerning eye for gemstones.",
  "$He$ has been drinking heavily.",
  "$He$ is rumored to have been an assasin."
];

/**
 * All of the above in one object, mirroring the Java interface members
 * (e.g. `GameStrings.creditText`).
 */
export const GameStrings = {
  creditText, GOSSIP, BORING, SAVE_CANCEL, MAIL_CANCEL, habits, features, phrases,
  colors, races, builds, heroHasDied, Names, signs, interests
};

// Compile-time guard: every named export above must appear in the object below.
const _allExports: Omit<typeof import('./GameStrings'), 'GameStrings'> = GameStrings;
void _allExports;
