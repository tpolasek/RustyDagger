/**
 * Phase 1 gate (plan: `test/serialize.test.ts`).
 *
 * `Item.toString()` *is* the save file and `Item.factory(Buffer)` is the loader,
 * so this file pins down three things:
 *
 *  1. a realistically populated `itHero` parses back through `Item.factory` to an
 *     equivalent hero and reserialises to the **exact same bytes** (a
 *     byte-identical round trip is what makes a re-saved hero safe to write);
 *  2. `Item.factory(Buffer)` dispatches on the `{icon|` prefix exactly like the
 *     Java hardcoded chain (`{#| {@| {%| {=| {~| {itList| {itArms| {itText|
 *     {itNote| {itAgent| {itHero| {itMonster|`, falling back to `itToken`);
 *  3. hand-written game data (the SPEC.md example and the Java
 *     `Quests`/`VQuests` monster strings, ported to `Static/Quests.ts`) loads into
 *     the expected object graph.
 *
 * Node-only: the Items/Static/Tools layers are pure logic - no DOM, no
 * localStorage, no screens are touched by this file.
 */

import { ok, match, strictEqual, deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";

import { Buffer } from "../src/ts/DCourt/Tools/Buffer";
import { Tools } from "../src/ts/DCourt/Tools/Tools";
import { Item } from "../src/ts/DCourt/Items/Item";
import { itList } from "../src/ts/DCourt/Items/itList";
import { itToken } from "../src/ts/DCourt/Items/itToken";
import { itCount } from "../src/ts/DCourt/Items/Token/itCount";
import { itPercent } from "../src/ts/DCourt/Items/Token/itPercent";
import { itRandom } from "../src/ts/DCourt/Items/Token/itRandom";
import { itValue } from "../src/ts/DCourt/Items/Token/itValue";
import { itArms } from "../src/ts/DCourt/Items/List/itArms";
import { itText } from "../src/ts/DCourt/Items/List/itText";
import { itNote } from "../src/ts/DCourt/Items/List/itNote";
import { itAgent } from "../src/ts/DCourt/Items/List/itAgent";
import { itHero } from "../src/ts/DCourt/Items/List/itHero";
import { itMonster } from "../src/ts/DCourt/Items/List/itMonster";
import { ArmsTrait } from "../src/ts/DCourt/Static/ArmsTrait";
import { Constants } from "../src/ts/DCourt/Static/Constants";
import { GearTypes } from "../src/ts/DCourt/Static/GearTypes";
import { townGuard } from "../src/ts/DCourt/Static/Quests";

/* ------------------------------------------------------------------ helpers */

/** Java: `Item.factory(Buffer)` - via the string overload's explicit Buffer. */
function load(text: string): Item | null {
  return Item.factory(new Buffer(text));
}

/**
 * The save with the layout newlines/tabs removed: `Buffer` skips whitespace
 * between tokens, so this is the form to compare structure against (the exact
 * layout is pinned by the golden layout test above).  Spaces inside names
 * ("Long Sword") are kept, since they are part of the name.
 */
function unindent(text: string): string {
  return text.replace(/[\n\t]/g, "");
}

/** Parses the serialised form of `it`; fails the test when `factory` returns null. */
function roundTrip(it: Item): Item {
  const parsed = load(it.toString());
  if (parsed === null) {
    throw new Error(`Item.factory returned null for [${it.toString()}]`);
  }
  return parsed;
}

const HERO_NAME = "TestHero";
const TODAY = "2026-09-22";

/** The gift letter `itHero.update()` appends on a version upgrade (real game text). */
const LETTER_BODY =
  "Hi There,\nThe changes to DC1 are now complete except for fixing bugs.  In order to celebrate, everyone gets a onetime gift of cookies and a bottled faery.  Thanks for helping out.\n-Fred-";

/* Real `ArmsTable` rows: the item strings there are the save format itself. */
const ARMS_LONG_SWORD = "{itArms|Long Sword|7|0|0|right}";
const ARMS_HALF_PLATE = "{itArms|Half Plate|0|12|-6|body}";
const ARMS_SPARE_KNIFE = "{itArms|Knife|2|0|-1|right}";

/**
 * A hero in the state the game actually persists: built like
 * `arCreate.createHero()` (name + `fixLists()`), then played - equipped arms,
 * loot in the pack, a gift letter, rank/status/temp/values/store/looks filled in.
 */
function buildHero(): itHero {
  Tools.setToday(TODAY); // Player.readFindValues() sets this at login
  Tools.setSeed(0x5eed); // deterministic itCount offsets; the save only holds real counts

  const hero = new itHero(HERO_NAME);
  hero.fixLists(); // Java: Player.createHero()
  hero.setGuts(14);
  hero.setWits(10);
  hero.setCharm(8);

  // pack: money, healing, the gift letter and a spare weapon.
  const pack = hero.getPack();
  pack.clrQueue();
  pack.fix(Constants.MARKS, 425);
  pack.fix("Cookie", 3);
  pack.fix("Bottled Faery", 1);
  pack.fix(GearTypes.SALVE, 2);
  const letter = new itNote("Letter");
  letter.setFrom("Fred");
  letter.setDate(TODAY);
  letter.setBody(LETTER_BODY);
  pack.append(letter);
  pack.append(Item.factory(ARMS_SPARE_KNIFE)!);

  // gear: the equipped weapon (enchanted + glowing) and armour.
  const gear = hero.getGear();
  gear.clrQueue();
  const sword = Item.factory(ARMS_LONG_SWORD) as itArms;
  sword.fix(ArmsTrait.ENCHANT, 2);
  sword.fixTrait(ArmsTrait.GLOWS);
  gear.append(sword);
  gear.append(Item.factory(ARMS_HALF_PLATE)!);

  const rank = hero.getRank();
  rank.clrQueue();
  rank.fix(Constants.LEVEL, 3);
  rank.fix(Constants.SOCIAL, 2);
  rank.fix(Constants.FIGHT, 2);
  rank.add(Constants.MAGIC, 1);
  hero.setClan("Dragonslayers");

  const status = hero.getStatus();
  status.clrQueue();
  status.fix(Constants.AGE, 17);
  status.fix(Constants.EXP, 645);
  status.fix(Constants.FAME, 41);
  status.fix(Constants.VERSION, 10);
  status.fixTrait(Constants.GUILD);

  const temp = hero.getTemp();
  temp.clrQueue();
  temp.fix(Constants.ACTIONS, 4);
  temp.fix(Constants.WOUNDS, 3);
  temp.fix(Constants.FIGHT, 2);
  temp.fix(Constants.MAGIC, 1);

  hero.setState(itAgent.ALIVE);
  hero.setPlace(Constants.FIELDS);
  hero.getValues().fix("pic", "Faces/Hero.jpg");
  hero.getValues().fix("Date", TODAY);

  const store = hero.getStore();
  store.clrQueue();
  store.fix(Constants.MARKS, 1200);
  store.fix("Silver Staff", 1);
  store.fix("Bless Scroll", 2);

  const looks = hero.getLooks();
  looks.clrQueue();
  looks.fix(Constants.TITLE, Constants.FEMALE);
  looks.fix(Constants.RACE, "Human");
  looks.fix(Constants.BUILD, "Slim");
  looks.fix(Constants.SIGN, "Dragon");
  looks.fix(Constants.HAIR, "Black");
  looks.fix(Constants.EYES, "Green");
  looks.fix(Constants.SKIN, "Pale");

  hero.calcCombat();
  hero.calcRaise();
  return hero;
}

/* ------------------------------------------------- the hero save round trip */

test("buffered hero save round-trips byte-identically through Item.factory", () => {
  const hero = buildHero();
  const save = hero.toString();

  // The save really is a single itHero entity with the full expected structure.
  // (`itAgent.toString` ends the attribute line with "\n\t", and `itList.listBody`
  //  then emits the leading `|` of each child list on its own line.)
  ok(
    save.startsWith(`{itHero|${HERO_NAME}|14|10|8\n\t|\n\t{~|pack|{#|Marks|425}`),
    JSON.stringify(save.slice(0, 80)),
  );
  ok(save.includes("{itArms|Long Sword|7|0|0|right|{#|Enchant|2}|Glows}"));
  // itList.listBody wraps a child after every 6 "icon slots", so the note's third
  // field lands on a new line - whitespace the tokenizer skips on the way back in.
  ok(save.includes("{itNote|Letter|{=|from|Fred}|{=|date|" + TODAY + "}"));
  ok(save.includes("{=|body|" + LETTER_BODY + "}}"));
  ok(save.includes("{~|stat|"));
  // `itList.add` inserts new counters at the front, so "magic" precedes the
  // counters that were fixed before it (Java's itList does the same).
  ok(
    unindent(save).includes(
      "{~|rank|{#|magic|1}|{#|Level|3}|{#|Social|2}|{#|fight|2}|{=|Clan|Dragonslayers}}",
    ),
  );
  ok(
    unindent(save).includes(
      "{~|gear|{itArms|Long Sword|7|0|0|right|{#|Enchant|2}|Glows}" +
        "|{itArms|Half Plate|0|12|-6|body}}",
    ),
  );

  const parsed = roundTrip(hero);
  ok(parsed instanceof itHero, "the save must parse back into an itHero");
  // Byte-identical: toString(factory(hero.toString())) === hero.toString().
  strictEqual(parsed.toString(), save);

  // ... and the round trip is a fixed point (a re-save does not drift).
  const again = roundTrip(parsed);
  strictEqual(again.toString(), save);
  strictEqual(roundTrip(again).toString(), save);
});

test("parsed hero carries the same state as the built hero", () => {
  const hero = buildHero();
  const parsed = roundTrip(hero) as itHero;

  strictEqual(parsed.getName(), HERO_NAME);
  strictEqual(parsed.getGuts(), 14);
  strictEqual(parsed.getWits(), 10);
  strictEqual(parsed.getCharm(), 8);
  // attack/defend/skill are *derived* (calcCombat), so they are not in the save;
  // the loader recomputes them exactly like itHero.update() does at login.
  parsed.calcCombat();
  parsed.calcRaise();
  strictEqual(parsed.getAttack(), hero.getAttack());
  strictEqual(parsed.getDefend(), hero.getDefend());
  strictEqual(parsed.getSkill(), hero.getSkill());
  strictEqual(parsed.getRaise(), hero.getRaise());

  // pack
  strictEqual(parsed.getMoney(), 425);
  strictEqual(parsed.packCount("Cookie"), 3);
  strictEqual(parsed.packCount("Bottled Faery"), 1);
  strictEqual(parsed.packCount(GearTypes.SALVE), 2);
  strictEqual(parsed.getPack().getCount(), hero.getPack().getCount());
  const parsedLetter = parsed.getPack().find("Letter") as itNote;
  ok(parsedLetter instanceof itNote);
  strictEqual(parsedLetter.getFrom(), "Fred");
  strictEqual(parsedLetter.getDate(), TODAY);
  strictEqual(parsedLetter.getBody(), LETTER_BODY); // multi-line body survives intact

  // gear (traits + enchant survive the trip)
  const parsedSword = parsed.getGear().select(0) as itArms;
  ok(parsedSword instanceof itArms);
  strictEqual(parsedSword.getEnchant(), 2);
  strictEqual(parsedSword.hasTrait(ArmsTrait.GLOWS), true);
  strictEqual(parsed.getWeapon(), "Long Sword");
  strictEqual(parsed.getArmour(), "Half Plate");

  // rank / status / temp / values / store / looks
  strictEqual(parsed.getLevel(), 3);
  strictEqual(parsed.getSocial(), 2);
  strictEqual(parsed.fightRank(), 2);
  strictEqual(parsed.magicRank(), 1);
  strictEqual(parsed.getClan(), "Dragonslayers");
  strictEqual(parsed.getAge(), 17);
  strictEqual(parsed.getExp(), 645);
  strictEqual(parsed.getFame(), 41);
  strictEqual(parsed.getVersion(), 10);
  strictEqual(parsed.hasTrait(Constants.GUILD), true);
  strictEqual(parsed.actCount(), 4);
  strictEqual(parsed.getWounds(), 3);
  strictEqual(parsed.getPlace(), Constants.FIELDS);
  strictEqual(parsed.getState(), itAgent.ALIVE);
  strictEqual(parsed.isAlive(), true);
  strictEqual(parsed.storeCount(Constants.MARKS), 1200);
  strictEqual(parsed.getStore().getCount(), 3);
  strictEqual(parsed.getLooks().getCount(), 7);
  strictEqual(parsed.getGender(), 1); // looks Title == "Female"
  strictEqual(parsed.getRankTitle(), "Baroness");
  strictEqual(parsed.getValues().getValue("Date"), TODAY);

  // the transient dump list is never serialised (Java keeps it out of toString too)
  strictEqual(parsed.getDump().getCount(), 0);
  strictEqual(hero.toString().includes("dump"), false);
});

test("hero save layout is the documented multi-line entity form", () => {
  // Every named list is present, so itHero.fixLists() must not append anything
  // and the canonical text can be compared byte for byte.  (Whitespace in the
  // *input* is insignificant - the tokenizer skips it - which is exactly why
  // the canonical form has to be stable.)
  const save =
    "{itHero|TestHero|1|2|3\n" +
    "\t|\n" +
    "\t{~|pack|{#|Marks|10}}|\n" +
    "\t{~|gear}|\n" +
    "\t{~|stat|{#|Version|10}}|\n" +
    "\t{~|temp}|\n" +
    "\t{~|rank}|\n" +
    "\t{~|values|{=|place|fields}}|\n" +
    "\t{~|store}|\n" +
    "\t{~|looks}}";

  const parsed = load(save) as itHero;
  ok(parsed instanceof itHero);
  strictEqual(parsed.getMoney(), 10);
  strictEqual(parsed.getVersion(), 10);
  strictEqual(parsed.getPlace(), Constants.FIELDS);
  strictEqual(parsed.toString(), save);
});

/* ------------------------------------------------- Item.factory dispatch */

test("Item.factory(Buffer) dispatches on every save-format prefix", () => {
  const cases: Array<[string, unknown]> = [
    ["{itHero|Ted|1|2|3|{~|pack}|{~|gear}|{~|stat}|{~|temp}|{~|rank}|{~|values}|{~|store}|{~|looks}}", itHero],
    ["{itAgent|Npc|1|2|3", itHero], // Java routes itAgent to itHero.factory
    ["{itMonster|Beast|4|5|6|7|8|9", itMonster],
    ["{~|pack|{#|Marks|5}}", itList],
    ["{itList|pack}", itList],
    ["{itArms|Knife|2|0|-1|right}", itArms],
    ["{itText|text|hello}", itText],
    ["{itNote|Letter|{=|from|Fred}}", itNote],
    ["{#|Marks|5}", itCount],
    ["{%|Flame Scroll|80}", itPercent],
    ["{@|Gold Apple|5}", itRandom],
    ["{=|place|fields}", itValue],
    ["Marks", itToken], // no prefix: the itToken fallback
  ];

  for (const [text, expected] of cases) {
    const parsed = load(text);
    ok(parsed instanceof (expected as new () => unknown), `bad dispatch for [${text}]`);
  }

  strictEqual(load("{*|Marks|5}"), null); // not a factory prefix (see the asymmetry test)
  strictEqual(load("{"), null);
});

test("Buffer tokenizes the entity format", () => {
  const buf = new Buffer("{#|Marks|425}");
  strictEqual(buf.begin(), true);
  strictEqual(buf.token(), "#");
  strictEqual(buf.split(), true);
  strictEqual(buf.token(), "Marks");
  strictEqual(buf.num(), 0); // "Marks" is not a number -> parseInt fallback
  strictEqual(buf.split(), true);
  strictEqual(buf.num(), 425);
  strictEqual(buf.end(), true);
  strictEqual(buf.isDone(), true);

  // out-of-range reads return 0 (Java charAt semantics), never throw
  strictEqual(new Buffer("").begin(), false);
  strictEqual(new Buffer("{").split(), false);
});

/* ------------------------------------------------------------ itMonster data */

/**
 * The `itMonster` example from SPEC.md (same fields, same order), written in the
 * real byte format: SPEC.md lays the entity out over several lines for
 * readability, but `Item.factory`'s prefix check compares `{itMonster|` as a
 * literal after skipping leading whitespace only (`Buffer.startsWith`), so the
 * `{` must be adjacent to the type - exactly as in the Java data strings.
 */
const SPEC_PANDA =
  "{itMonster|Panda|100|120|120|100|100|80" +
  "|{=|pic|Shang/Panda.jpg}" +
  "|{~|values|{=|passion|defensive}}" +
  "|{~|pack|{#|Gold Apple|2}|{@|Gold Apple|5}|{@|Enchant Scroll|5}|{@|Bless Scroll|2}" +
  "|{%|Flame Scroll|80}|{%|Luck Scroll|60}|{%|Youth Elixir|20}|{%|Thief Insurance|60}" +
  "|{%|Bottled Faery|8}}" +
  "|{~|temp|{#|Actions|3}|{#|magic|4}|{#|fight|2}}" +
  "|{~|gear|{%|Clawed Paws|0}|{%|Furry Hide|0}}" +
  "|{~|opts|help|backstab|swindle|control}" +
  "|{itText|text|A blind old woman is walking with the aid of her trained panda.  " +
  "She starts gabbling at you in that strange tongue they use here.  " +
  "She seems to need directions, good luck with pointing.}" +
  "}";

test("SPEC.md itMonster fixture parses into an itMonster", () => {
  const panda = load(SPEC_PANDA);
  ok(panda instanceof itMonster, "the SPEC.md sample must load as an itMonster");
  const monster = panda as itMonster;

  strictEqual(monster.getName(), "Panda");
  strictEqual(monster.getGuts(), 100);
  strictEqual(monster.getWits(), 120);
  strictEqual(monster.getCharm(), 120);
  strictEqual(monster.findValue("pic"), "Shang/Panda.jpg");

  strictEqual(monster.getValues().getValue("passion"), itMonster.DEFENSIVE);
  // The quest data spells the action counter "Actions" while `Constants.ACTIONS`
  // is "Action" (an inherited Java mismatch) - the data's spelling is asserted here.
  strictEqual(monster.getTemp().getCount("Actions"), 3);
  strictEqual(monster.getTemp().getCount(Constants.MAGIC), 4);
  strictEqual(monster.getTemp().getCount(Constants.FIGHT), 2);

  // 9 entries in the SPEC sample, but `itList.append` merges same-named counters,
  // so the second "Gold Apple" folds into the first: 8 entries, 2 + 5 apples.
  strictEqual(monster.getPack().getCount(), 8);
  strictEqual(monster.getPack().getCount("Gold Apple"), 7);
  ok(monster.getPack().find("Enchant Scroll") instanceof itRandom);
  ok(monster.getPack().find("Flame Scroll") instanceof itPercent);

  strictEqual(monster.getGear().getCount(), 2);
  strictEqual(monster.getOptions().getCount(), 4);
  deepStrictEqual(
    monster.getOptions().elements().map((it) => it.getName()),
    ["help", "backstab", "swindle", "control"],
  );

  // the itText child is named "text" (see itMonster.fixLists) and has no $KEY$ lists
  strictEqual(monster.getText().startsWith("A blind old woman is walking"), true);
  strictEqual(monster.getText().endsWith("good luck with pointing."), true);
});

test("Java Quests/VQuests monster data parses (Static/Quests.ts)", () => {
  // `townGuard` is the ported `DCourt.Screens.Quest.Quests.townGuard` string, tabs
  // and all - it exercises itValue + itList + itCount + itRandom + itPercent +
  // itText with MadLib word lists.
  const guard = load(townGuard);
  ok(guard instanceof itMonster, "Java monster data must load as an itMonster");
  const monster = guard as itMonster;

  strictEqual(monster.getName(), "Guard");
  strictEqual(monster.getGuts(), 50);
  strictEqual(monster.getWits(), 50);
  strictEqual(monster.getCharm(), 50);
  strictEqual(monster.findValue("pic"), "Other/Guard.jpg");
  strictEqual(monster.getValues().getValue("passion"), itMonster.HOSTILE);
  strictEqual(monster.getTemp().getCount(Constants.FIGHT), 4);
  strictEqual(monster.getTemp().getCount("Actions"), 2); // data spelling, see above
  strictEqual(monster.getPack().getCount("Marks"), 500);
  // `{%|Steel Sword|20}|{%|Half Plate|20}|bless`: the trailing bare token is a
  // gear-list trait (itMonster.buildGear reads it), not a third item - hence 3.
  strictEqual(monster.getGear().getCount(), 3);
  strictEqual(monster.getGear().hasTrait("bless"), true);
  strictEqual(monster.getOptions().getCount(), 4);

  // itText.parseText() substitutes the $name$/$stout$ keys from the child lists,
  // so the loaded line must contain one of the alternatives.
  const text = monster.getText();
  ok(/The palace is guarded by a (stout|sturdy|tough|brawny|strong) (Soldier|Pikeman|Knight|Trooper)/
    .test(text), text);
});

test("a monster in save form round-trips byte-identically", () => {
  // Built the way itMonster.factory() builds one, i.e. count/value/arms children
  // only.  (`{@|` entries cannot round-trip - see the asymmetry test below - and a
  // live fight materialises them via itMonster.buildPack() before loot is saved.)
  const beast = new itMonster("Test Beast");
  beast.setGuts(30);
  beast.setWits(18);
  beast.setCharm(12);
  beast.append(new itValue("pic", "Fields/Rodent.jpg"));
  beast.append(new itList("opts", ["feed", "backstab", "control"]));
  beast.append(new itText("text", "A test beast snarls at you."));
  beast.fixLists();
  beast.getPack().fix(Constants.MARKS, 45);
  beast.getPack().fix(GearTypes.APPLE, 2);
  beast.getPack().append(Item.factory(ARMS_HALF_PLATE)!);
  beast.getGear().append(Item.factory(ARMS_LONG_SWORD)!);
  beast.getTemp().fix(Constants.ACTIONS, 3);
  beast.getTemp().fix(Constants.FIGHT, 2);
  beast.getStatus().fix(Constants.FAME, 20);

  const save = beast.toString();
  ok(save.startsWith("{itMonster|Test Beast|30|18|12|0|0|0"));

  const parsed = roundTrip(beast) as itMonster;
  strictEqual(parsed.getName(), "Test Beast");
  strictEqual(parsed.getGuts(), 30);
  strictEqual(parsed.getPack().getCount(Constants.MARKS), 45);
  strictEqual(parsed.getPack().getCount(GearTypes.APPLE), 2);
  strictEqual(parsed.getWeapon(), "Long Sword"); // gear.select(0), as in the data strings
  strictEqual(parsed.getText(), "A test beast snarls at you.");
  strictEqual(parsed.getOptions().getCount(), 3);
  strictEqual(parsed.toString(), save);
  strictEqual(roundTrip(parsed).toString(), save);
});

test("monster attribute fields: game data holds baseA/D/S, factory reads them as such", () => {
  const loaded = load(townGuard) as itMonster;
  strictEqual(loaded.getGuts(), 50);
  strictEqual(loaded.getWits(), 50);
  strictEqual(loaded.getCharm(), 50);

  // The Java data string is `{itMonster|Guard|50|50|50|20|20|40|...}`: the last
  // three fields are baseA/baseD/baseS (loadSecondary).  itMonster.toString()
  // prints attack/defend/skill instead, which a freshly loaded monster has not
  // computed yet (calcCombat() is what fills them) - so the save form of a table
  // monster carries 0/0/0 there.  Monsters are load-only data in this game, and
  // the hero save (the file that is actually written) is unaffected.
  const canonical = loaded.toString();
  match(canonical, /^\{itMonster\|Guard\|50\|50\|50\|0\|0\|0/);
});

test("known asymmetry: {@| loot entries reserialize as {*| and cannot be read back", () => {
  // itRandom.getIcon() is "*" while Item.factory's prefix chain (verbatim from
  // Java's Item.factory) only knows "{@|".  A monster pack is therefore lossy in
  // save form; the Java game has the same asymmetry, and the hero save this test
  // suite round-trips never holds itRandom entries (loot is materialised by
  // itMonster.buildPack() -> GearTable.shopItem into itCount/itArms/itNote).
  const loot = load("{~|pack|{@|Marks|50}|{@|Gold Apple|2}}")!;
  strictEqual(loot.toString(), "{~|pack|{*|Marks|50}|{*|Gold Apple|2}}");
  strictEqual(load("{*|Marks|50}"), null);
  strictEqual(load("{#|Marks|50}")!.toString(), "{#|Marks|50}"); // the itCount form is stable
  strictEqual(load("{%|Marks|50}")!.toString(), "{%|Marks|50}"); // ... and so is itPercent
});
