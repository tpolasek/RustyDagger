import type { Item } from '../Items/Item';
import { itCount } from '../Items/Token/itCount';
import { itList } from '../Items/itList';
import {
  BLAST_DUST,
  BLIND_DUST,
  effectLabel,
  FISH,
  FOOD,
  GINSENG,
  INSURANCE,
  MANDRAKE,
  PANIC_DUST,
  SALVE,
  SELTZER,
  TOKEN,
} from '../Static/GearTypes';
import { Tools } from '../Tools/Tools';
import { ArmsTable } from './ArmsTable';

/** Java `GearTable$GearRecord` - one row of the static gear table. */
export class GearRecord {
  constructor(
    private readonly name: string,
    private readonly type: number,
    private readonly cost: number,
    private readonly effect: number
  ) {}

  getName(): string {
    return this.name;
  }

  getType(): number {
    return this.type;
  }

  getCost(): number {
    return this.cost;
  }

  getEffect(): number {
    return this.effect;
  }
}

/**
 * Java `DCourt.Control.GearTable` (`GearTable.java`) - the static (non-arms) item table:
 * types, shop costs and use-effects for every named item.
 *
 * Data ported verbatim from `GearTable.java:146-213`. Note that two rows deliberately use the
 * screen metrics as costs (`Tools.DEFAULT_WIDTH` = 400 for "Gold Nugget"/"Blinding Dust",
 * `Tools.DEFAULT_HEIGHT` = 300 for "Glow Scroll"); that oddity is preserved on purpose.
 *
 * Java's static `Hashtable table` becomes a `Map`. `findList`/`findVector` therefore iterate in
 * table-declaration order instead of Java's hash order - sets of items are identical, but shop
 * listing order becomes deterministic rather than arbitrary.
 */
export class GearTable {
  private static table: Map<string, GearRecord> | null = null;
  /** Java assigns this inside `buildTable()`; initialized here so `get()` is total. */
  private static unknown: GearRecord = new GearRecord('Unknown', 0, 0, 0);

  constructor() {
    this.buildTable();
  }

  /** Java `static boolean find(Item|String)` (`GearTable.java:21-40`); null keys are not logged. */
  static find(what: Item | string | null): boolean {
    if (what == null) {
      return false;
    }
    const key = typeof what === 'string' ? what : what.getName();
    if (GearTable.table?.get(key) != null || ArmsTable.find(key)) {
      return true;
    }
    console.error(`GearTable could not find item=[${key}]`);
    return false;
  }

  /**
   * Java's `add(String,int,int)` / `add(String,int,int,int)` overloads collapsed into one method
   * with a defaulted `effect` (Java's unused `add(GearRecord)` overload is folded in as well).
   */
  private add(name: string, type: number, cost: number, effect = 0): void {
    if (GearTable.table == null) {
      GearTable.table = new Map<string, GearRecord>();
    }
    if (GearTable.table.get(name) != null) {
      console.error(`GearTable duplicate key=[${name}]`);
      return;
    }
    GearTable.table.set(name, new GearRecord(name, type, cost, effect));
  }

  /** Java `static GearRecord get(String key)` (`GearTable.java:63-66`): `unknown` when missing. */
  private static get(key: string): GearRecord {
    return GearTable.table?.get(key) ?? GearTable.unknown;
  }

  private static keyOf(what: Item | string): string {
    return typeof what === 'string' ? what : what.getName();
  }

  /** Java `static itList findList(String name, int type)` (`GearTable.java:68-78`). */
  static findList(name: string, type: number): itList {
    const list = new itList(name);
    if (GearTable.table != null) {
      for (const rec of GearTable.table.values()) {
        if (rec.getType() === type) {
          list.fix(rec.getName(), rec.getCost());
        }
      }
    }
    return list;
  }

  /** Java `static Vector findVector(int type)` (`GearTable.java:80-90`) - `Vector` becomes `T[]`. */
  static findVector(type: number): string[] {
    const list: string[] = [];
    if (GearTable.table != null) {
      for (const rec of GearTable.table.values()) {
        if (rec.getType() === type) {
          list.push(rec.getName());
        }
      }
    }
    return list;
  }

  /**
   * Java `static Item shopItem(Item|String)` (`GearTable.java:92-99`): known gear yields an
   * `itCount` priced by the table, anything else falls through to the arms table.
   */
  static shopItem(what: Item | string): Item | null {
    const key = GearTable.keyOf(what);
    const rec = GearTable.get(key);
    return rec === GearTable.unknown ? ArmsTable.shopItem(key) : new itCount(key, rec.getCost());
  }

  /** Java `static int getType(Item|String)` (`GearTable.java:101-103, 129-131`). */
  static getType(what: Item | string): number {
    return GearTable.get(GearTable.keyOf(what)).getType();
  }

  /** Java `static int getCost(Item|String)` (`GearTable.java:105-107, 133-135`). */
  static getCost(what: Item | string): number {
    return GearTable.get(GearTable.keyOf(what)).getCost();
  }

  /** Java `static int getEffect(Item|String)` (`GearTable.java:109-111, 137-139`). */
  static getEffect(what: Item | string): number {
    return GearTable.get(GearTable.keyOf(what)).getEffect();
  }

  /** Java `static boolean isScroll(Item)` (`GearTable.java:113-115`) - type 7. */
  static isScroll(what: Item | string): boolean {
    return GearTable.getType(what) === 7; // GearTypes.TYPE_SCROLL
  }

  /** Java `static boolean canHeroUse(Item)` (`GearTable.java:117-119`) - effect != 0. */
  static canHeroUse(what: Item | string): boolean {
    return GearTable.getEffect(what) !== 0;
  }

  /**
   * Java `static boolean canMageUse(Item|String)` (`GearTable.java:121-123, 141-144`):
   * gem-type rows (type 5) whose cost the hero's magic rank can cover.
   */
  static canMageUse(what: Item | string): boolean {
    const skill = Tools.getHero().magicRank();
    return GearTable.getType(what) === 5 && skill * skill * 25 >= GearTable.getCost(what); // GearTypes.TYPE_GEMS
  }

  /** Java `static String effectLabel(Item)` (`GearTable.java:125-127`). */
  static effectLabel(what: Item | string): string {
    return effectLabel[GearTable.getEffect(what)];
  }

  /** Java `synchronized void buildTable()` (`GearTable.java:146-213`); builds once. */
  buildTable(): void {
    if (GearTable.table != null) {
      return;
    }
    GearTable.table = new Map<string, GearRecord>();
    GearTable.unknown = new GearRecord('Unknown', 0, 0, 0);
    this.add('Marks', 9, 1);
    this.add('Map to Warrens', 1, 500);
    this.add('Map to Treasury', 1, 2000);
    this.add('Map to Throne Room', 1, 5000);
    this.add('Map to Vortex', 1, 10000);
    this.add('Rutter for Hie Brasil', 1, 6000);
    this.add('Rutter for Shangala', 1, 12000);
    this.add('Time Crystal', 1, 18000);
    this.add('Castle Permit', 1, 5000);
    this.add('Sleeping Bag', 2, 25);
    this.add('Cooking Gear', 2, 75);
    this.add('Camp Tent', 2, 150);
    this.add(FOOD, 3, 2, 21);
    this.add(FISH, 3, 2, 21);
    this.add('Torch', 3, 5);
    this.add('Rope', 3, 8);
    this.add('Pen & Paper', 3, 12, 14);
    this.add('Teeth', 4, 2);
    this.add('Tusk', 4, 200);
    this.add('Gold Nugget', 4, Tools.DEFAULT_WIDTH);
    this.add('Horn', 4, 600);
    this.add('Crystal Crown', 4, 2500);
    this.add('Platinum Ring', 4, 8000);
    this.add('Dragon Scales', 4, 5000);
    this.add('Quartz', 5, 100, 1);
    this.add('Opal', 5, 250, 2);
    this.add('Garnet', 5, 650, 3);
    this.add('Emerald', 5, 1250, 5);
    this.add('Ruby', 5, 2400, 4);
    this.add('Turquoise', 5, 3500, 6);
    this.add('Diamond', 5, 5000, 10);
    this.add(SALVE, 6, 150, 2);
    this.add(SELTZER, 6, 200, 3);
    this.add('Gold Apple', 6, 500, 7);
    this.add(GINSENG, 6, 1000, 8);
    this.add(MANDRAKE, 6, 2000, 9);
    this.add('Cookie', 6, 1, 10);
    this.add(BLIND_DUST, 6, Tools.DEFAULT_WIDTH, 4);
    this.add(PANIC_DUST, 6, 800, 5);
    this.add(BLAST_DUST, 6, 2000, 6);
    this.add('Youth Elixir', 6, 8000, 11);
    this.add('Aging Elixir', 6, 1000, 12);
    this.add('Faceless Potion', 6, 1500, 13);
    this.add('Identify Scroll', 7, 60, 1);
    this.add('Glow Scroll', 7, Tools.DEFAULT_HEIGHT, 15);
    this.add('Bless Scroll', 7, 1000, 16);
    this.add('Luck Scroll', 7, 1500, 17);
    this.add('Flame Scroll', 7, 3500, 18);
    this.add('Enchant Scroll', 7, 2500, 19);
    this.add('Bottled Faery', 8, 800);
    this.add(INSURANCE, 8, 1000);
    this.add(TOKEN, 8, 0);
    this.add('Postcard', 8, 0);
    this.add('Letter', 8, 0);
    this.add('Petition', 8, 0);
    this.add('Grant', 8, 0, 20);
    this.add('Denial', 8, 0);
    this.add('Gobble Inn Postcard', 0, 50, 14);
    this.add('Gobble Inn T-Shirt', 0, 100);
    this.add('Troll Wart', 0, 0);
    this.add('Turnip', 0, 0);
    this.add('Rock', 0, 0);
  }
}
