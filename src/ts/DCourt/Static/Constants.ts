/*
 * Ported from DCourt/Static/Constants.java (Java interface Constants).
 * Member names and values are kept verbatim; use a namespace import
 * (`import * as Constants from './Constants'`) so call sites read like the Java.
 */

import { StaticList } from './StaticList';

export const PLACE_MAX: number = 11;

export const SUITE: string = "suite";

export const ROOM: string = "room";

export const FLOOR: string = "floor";

export const COT: string = "cot";

export const TOWN: string = "town";

export const FIELDS: string = "fields";

export const FOREST: string = "forest";

export const HILLS: string = "hills";

export const MOUND: string = "mound";

export const DOCKS: string = "docks";

export const DUNJEON: string = "dunjeon";

export const PLACE_ARRAY: string[] = [
  SUITE, ROOM, FLOOR, COT, TOWN, FIELDS, FOREST, HILLS, MOUND, DOCKS, DUNJEON
];

export const PLACE_LIST: StaticList = new StaticList("Place", PLACE_ARRAY);

export const placeCamp: number[] = [0, 0, 1, 3, 0, 3, 7, 3, 1, 0, 0];

export const FIGHT: string = "fight";

export const MAGIC: string = "magic";

export const THIEF: string = "thief";

export const IEATSU: string = "Ieatsu";

export const ATTACK: string = "Attack";

export const DEFEND: string = "Defend";

export const SKILL: string = "Skill";

export const SPELLS: string = "Magic Assault";

export const VICTORY: string = "Victory";

export const RUNAWAY: string = "Runs Aways";

export const BERZERK: string = "Berzek";

export const CONTROL: string = "Control";

export const SWINDLE: string = "Swindle";

export const BACKSTAB: string = "Backstab";

export const WORM: string = "worm";

export const GOAT: string = "goat";

export const EXP: string = "Exp";

export const AGE: string = "Age";

export const FAME: string = "Fame";

export const HIGH: string = "High";

export const PEAK: string = "Peak";

export const LEVEL: string = "Level";

export const MONEY: string = "Marks";

export const SOCIAL: string = "Social";

export const ACTIONS: string = "Action";

export const WOUNDS: string = "Wounds";

export const FATIGUE: string = "Fatigue";

export const DISEASE: string = "Disease";

export const STIPEND: string = "Stipend";

export const BLIND_STR: string = "*BLIND*";

export const PANIC_STR: string = "+PANIC+";

export const FAVOR: string = "Favor";

export const VERSION: string = "Version";

export const MAIL: string = "Mail";

export const TITLE: string = "Title";

export const MALE: string = "Male";

export const FEMALE: string = "Female";

export const BOTH: string = "Both";

export const NONE: string = "None";

export const sexs: string[] = [MALE, FEMALE, BOTH, NONE];

export const GENDER: string = "Gender";

export const DRESS: string = "Dress";

export const BEHAVE: string = "Behave";

export const RACE: string = "Race";

export const BUILD: string = "Build";

export const SIGN: string = "Sign";

export const SKIN: string = "Skin";

export const EYES: string = "Eyes";

export const HAIR: string = "Hair";

export const HABIT: string = "Habit";

export const CLAN: string = "Clan";

export const MARKS: string = "Marks";

export const PHRASE: string = "Phrase";

export const RANK: string = "Rank";

export const NAME: string = "Name";

export const GUTS: string = "Guts";

export const WITS: string = "Wits";

export const CHARM: string = "Charm";

export const MAXRANK: number = 10;

export const rankTitle: string[] = [
  "",
  "Sr. ",
  "Brn. ",
  "Cnt. ",
  "Vct. ",
  "Mqs. ",
  "Earl ",
  "Duke ",
  "Prc. ",
  "Regent ",
  "Ruler ",
  "Emperor "
];

export const rankName: string[][] = [
  [
    "Peasant",
    "Knight",
    "Baron",
    "Count",
    "Viscount",
    "Marquis",
    "Earl",
    "Duke",
    "Prince",
    "Regent",
    "King",
    "Emperor"
  ],
  [
    "Peasant",
    "Dame",
    "Baroness",
    "Countess",
    "Comtessa",
    "Marquessa",
    "Earl",
    "Duchess",
    "Princess",
    "Regent",
    "Queen",
    "Empress"
  ]
];

export const rankCost: number[] = [5, 20, 80, 320, 1250, 5000, 20000, 80000, 320000, 0, 0, 0];

export const GUILD: string = "Guild";

export const MYSTIC: string = "Mystic";

export const TRADER: string = "Trader";

export const ILLUMINATI: string = "Illuminati";

export const STRONG: string = "Strong";

export const STURDY: string = "Sturdy";

export const AGILE: string = "Agile";

export const UNAGING: string = "Unaging";

export const CATSEYES: string = "CatsEyes";

export const HILLFOLK: string = "HillFolk";

export const SWIFT: string = "Swift";

export const SINCERE: string = "Sincere";

export const TRICKY: string = "Tricky";

export const EMPATHIC: string = "Empathic";

export const SEXY: string = "Sexy";

export const FENCER: string = "Fencer";

export const STUBBORN: string = "Stubborn";

export const CLEVER: string = "Clever";

export const DRAGON: string = "Dragon";

export const POPULAR: string = "Popular";

export const RANGER: string = "Ranger";

export const GYPSY: string = "Gypsy";

export const MERCHANT: string = "Merchant";

export const BANDIT: string = "Bandit";

export const MEDIC: string = "Medic";

export const SMITH: string = "Smith";

export const ARMOR: string = "Armor";

export const QUICK: string = "Quick";

export const HOTEL: string = "Hotel";

export const HARDY: string = "Hardy";

export const ALERT: string = "Alert";

export const REFLEX: string = "Reflex";

export const TraitList: string[] = [
  ARMOR,
  AGILE,
  ALERT,
  BANDIT,
  BERZERK,
  CATSEYES,
  CLEVER,
  DRAGON,
  EMPATHIC,
  FENCER,
  GUILD,
  GYPSY,
  HARDY,
  HOTEL,
  HILLFOLK,
  ILLUMINATI,
  MEDIC,
  MERCHANT,
  MYSTIC,
  POPULAR,
  RANGER,
  REFLEX,
  SINCERE,
  SEXY,
  SMITH,
  STRONG,
  STUBBORN,
  STURDY,
  SWIFT,
  TRADER,
  TRICKY,
  UNAGING,
  QUICK
];

export const TraitStub: string[] = [
  "AR", "AG", "AL", "BA", "BE", "CA", "CL", "DR", "EM", "FE", "GU", "GY", "HA", "HO", "HI", "IL",
  "MM", "MR", "MY", "PO", "RA", "RE", "SI", "SE", "SM", "ST", "SB", "SR", "SW", "TA", "TK", "UN",
  "QU"
];

/**
 * All of the above in one object, mirroring the Java interface members
 * (e.g. `Constants.PLACE_MAX`).
 */
export const Constants = {
  PLACE_MAX, SUITE, ROOM, FLOOR, COT, TOWN, FIELDS, FOREST, HILLS, MOUND, DOCKS,
  DUNJEON, PLACE_ARRAY, PLACE_LIST, placeCamp, FIGHT, MAGIC, THIEF, IEATSU, ATTACK,
  DEFEND, SKILL, SPELLS, VICTORY, RUNAWAY, BERZERK, CONTROL, SWINDLE, BACKSTAB, WORM,
  GOAT, EXP, AGE, FAME, HIGH, PEAK, LEVEL, MONEY, SOCIAL, ACTIONS, WOUNDS, FATIGUE,
  DISEASE, STIPEND, BLIND_STR, PANIC_STR, FAVOR, VERSION, MAIL, TITLE, MALE, FEMALE,
  BOTH, NONE, sexs, GENDER, DRESS, BEHAVE, RACE, BUILD, SIGN, SKIN, EYES, HAIR, HABIT,
  CLAN, MARKS, PHRASE, RANK, NAME, GUTS, WITS, CHARM, MAXRANK, rankTitle, rankName,
  rankCost, GUILD, MYSTIC, TRADER, ILLUMINATI, STRONG, STURDY, AGILE, UNAGING,
  CATSEYES, HILLFOLK, SWIFT, SINCERE, TRICKY, EMPATHIC, SEXY, FENCER, STUBBORN, CLEVER,
  DRAGON, POPULAR, RANGER, GYPSY, MERCHANT, BANDIT, MEDIC, SMITH, ARMOR, QUICK, HOTEL,
  HARDY, ALERT, REFLEX, TraitList, TraitStub
};

// Compile-time guard: every named export above must appear in the object below.
const _allExports: Omit<typeof import('./Constants'), 'Constants'> = Constants;
void _allExports;
