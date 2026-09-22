/**
 * WildsScreen - the DOM rewrite of `DCourt.Screens.Template.WildsScreen`
 * (`Template/WildsScreen.java`).
 *
 * Java: the abstract wilderness map every `Wilds.*` screen extends.  All the
 * shared adventuring mechanics live here and are ported verbatim:
 *
 *  - `goQuesting(loc)` = can the hero advance? (`testAdvance` -> `canAdvance`
 *    checks quests/rope/light) then look for a hidden site (`doSearch`), then
 *    run `pickQuest(loc)`;
 *  - `canAdvance` uses the three canned notices TOO_TIRED / NEED_ROPE /
 *    NEED_LIGHT;
 *  - `doSearch` rolls against the hero's wits on the map's hide bits, awards
 *    the find (`markFound`) plus a wits gain;
 *  - `selectQuest` picks a monster by weight, with a 1% Faery chance, from
 *    `Screen.findBeast("<Where>:<Name>")`;
 *  - `findClimb`/`findLight` consume a Rope, or honour the HillFolk/Catseyes
 *    traits, Glows/Flame gear and Torches.
 *
 * The map hit regions themselves live in the concrete screens (the `Portrait`
 * boxes, routed through `action` -> `getPic(e.target)`); this class only decides
 * what happens once a region is clicked.
 */

import type { itMonster } from "../../Items/List/itMonster";
import { ArmsTrait } from "../../Static/ArmsTrait";
import { Constants } from "../../Static/Constants";
import { Tools } from "../../Tools/Tools";
import { Screen } from "../../ui/screen";
import { arNotice } from "../Utility/arNotice";

export abstract class WildsScreen extends Screen {
  static readonly TOO_TIRED: string =
    "\tYou find yourself far too exhausted to continue adventuring.  Please return tommorow for further exploration.\n";
  static readonly NEED_ROPE: string =
    "\tYou cannot advance any further up these cliffs and crags without an additional supply of ROPE.\n";
  static readonly NEED_LIGHT: string =
    "\tYou can advance no further through these dark and dingy caverns without TORCHES or some other source of light.\n";

  /** Java `public abstract Screen pickQuest(int i)`. */
  abstract pickQuest(loc: number): Screen;

  /** Java `public abstract int getPower(int i)`. */
  abstract getPower(loc: number): number;

  /** Java `public abstract String getWhere(int i)`. */
  abstract getWhere(loc: number): string;

  /**
   * Java had four constructors (`()`, `(Screen)`, `(String)`, `(Screen, String)`);
   * this mirrors them, defaulting the title to "WildsScreen".
   */
  constructor(from?: Screen | string | null, name?: string) {
    if (typeof from === "string") super(from, name);
    else if (from) super(from, name ?? "WildsScreen");
    else super(name ?? "WildsScreen");
  }

  /** Java `needsLight(int loc)`. */
  needsLight(_loc: number): boolean {
    return false;
  }

  /** Java `needsRope(int loc)`. */
  needsRope(_loc: number): boolean {
    return false;
  }

  /** Java `getHideBits()`. */
  getHideBits(): number {
    return 0;
  }

  /** Java `markFound(int find)`. */
  markFound(_find: number): string {
    return "";
  }

  /** Java `goQuesting()` / `goQuesting(int loc)`. */
  goQuesting(loc = 0): void {
    if (this.testAdvance(loc) && !this.doSearch(loc)) {
      Tools.setRegion(this.pickQuest(loc));
    }
  }

  /** Java `testAdvance(int loc)`: show the blocking notice, if any. */
  testAdvance(loc: number): boolean {
    const test = this.canAdvance(loc);
    if (test === null) {
      return true;
    }
    Tools.setRegion(new arNotice(this, test));
    return false;
  }

  /** Java `String canAdvance(int loc)`: null when the hero may advance. */
  private canAdvance(loc: number): string | null {
    if (Screen.getQuests() < 1) {
      return WildsScreen.TOO_TIRED;
    }
    if (this.needsRope(loc) && !this.findClimb()) {
      return WildsScreen.NEED_ROPE;
    }
    if (!this.needsLight(loc) || this.findLight()) {
      return null;
    }
    return WildsScreen.NEED_LIGHT;
  }

  /** Java `boolean doSearch(int loc)`: the hidden-site roll. */
  private doSearch(loc: number): boolean {
    let count = 0;
    const bits = this.getHideBits();
    if (bits === 0 || !Tools.contest(Screen.getWits(), this.getPower(loc) * 20)) {
      return false;
    }
    for (let ix = bits; ix !== 0; ix >>= 1) {
      if ((ix & 1) !== 0) {
        count++;
      }
    }
    let num = Tools.roll(count);
    let ix2 = 1;
    let pick = -1;
    while (num >= 0) {
      if ((bits & ix2) !== 0) {
        num--;
      }
      pick++;
      ix2 <<= 1;
    }
    Screen.getHero().searchWork(1);
    Tools.setRegion(
      new arNotice(
        this,
        `${this.markFound(pick)}${Screen.getHero().gainWits(this.getPower(loc) + 2)}`,
      ),
    );
    return true;
  }

  /**
   * Java overloads:
   *   `selectQuest(String[] names, int[] weight)`            -> loc 0
   *   `selectQuest(int loc, String[][] names, int[][] weight)` -> row `loc`
   *   `selectQuest(int loc, String[] names, int[] weight)`
   *
   * The two array forms are told apart by their element type (Java did it with
   * static overload resolution).  The `loc` matters: `getWhere(loc)` picks the
   * monster table prefix, so arCastle's per-region rows resolve correctly.
   */
  selectQuest(names: string[], weight: number[]): itMonster | null;
  selectQuest(loc: number, names: string[][], weight: number[][]): itMonster | null;
  selectQuest(loc: number, names: string[], weight: number[]): itMonster | null;
  selectQuest(
    locOrNames: number | string[],
    namesOrWeight: string[] | string[][] | number[],
    weight?: number[] | number[][],
  ): itMonster | null {
    const loc = typeof locOrNames === "number" ? locOrNames : 0;
    const names = (typeof locOrNames === "number" ? namesOrWeight : locOrNames) as
      | string[]
      | string[][];
    const weights = (typeof locOrNames === "number" ? weight : namesOrWeight) as
      | number[]
      | number[][];
    if (names.length > 0 && Array.isArray(names[0])) {
      const rows = names as string[][];
      const perLoc = weights as number[][];
      return this.selectQuestPick(loc, rows[loc], perLoc[loc]);
    }
    return this.selectQuestPick(loc, names as string[], weights as number[]);
  }

  /** Java `itMonster selectQuest(int loc, String[] names, int[] weight)` body. */
  private selectQuestPick(loc: number, names: string[], weight: number[]): itMonster | null {
    if (Tools.percent(1)) {
      return Screen.findBeast("Faery") as itMonster | null;
    }
    let total = 0;
    for (const w of weight) {
      total += w;
    }
    let total2 = Tools.roll(total);
    for (let ix = 0; ix < weight.length; ix++) {
      total2 -= weight[ix];
      if (total2 < 0) {
        return Screen.findBeast(`${this.getWhere(loc)}:${names[ix]}`) as itMonster | null;
      }
    }
    return Screen.findBeast(`${this.getWhere(loc)}:${names[0]}`) as itMonster | null;
  }

  /** Java `findClimb()`: HillFolk, or spend a Rope. */
  findClimb(): boolean {
    return Screen.hasTrait(Constants.HILLFOLK) || Screen.subPack("Rope", 1) === 1;
  }

  /** Java `protected boolean findLight()`: Catseyes, Glows/Flame gear, or a Torch. */
  protected findLight(): boolean {
    return (
      Screen.hasTrait(Constants.CATSEYES) ||
      Screen.findGearTrait(ArmsTrait.GLOWS) !== null ||
      Screen.findGearTrait(ArmsTrait.FLAME) !== null ||
      Screen.subPack("Torch", 1) > 0
    );
  }
}
