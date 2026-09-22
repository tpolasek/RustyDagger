/*
 * Ported for: DCourt/Static/Constants.java (PLACE_LIST) and
 * DCourt/Static/ArmsTrait.java (traitList).
 *
 * In Java both of those are `DCourt.Items.itList` instances holding `itToken`
 * names, e.g. `public static final itList PLACE_LIST = new itList("Place", PLACE_ARRAY);`
 * The only operation the static data (and its one external user, `arFinish`) needs
 * is a name lookup (`firstOf`), but `DCourt/Static` must not depend on
 * `DCourt/Items` (that would invert the real dependency order) and the Items port
 * does not exist yet, so this class implements that small `itList` subset and
 * keeps the `itList` wire format for `toString()`.
 *
 * Seam: once `DCourt/Items/itList.ts` lands, build the two lists directly
 *   PLACE_LIST = new itList("Place", PLACE_ARRAY)
 *   traitList  = new itList("Traits", traitLabel)
 * and delete this file.
 */
export class StaticList {
  private readonly id: string;
  private readonly queue: string[];

  constructor(id: string, list: readonly string[] = []) {
    this.id = id;
    this.queue = [];
    this.merge(list);
  }

  /** Java `itList`/`itToken.getName()`. */
  getName(): string {
    return this.id;
  }

  /** Java `itList.getCount()`. */
  getCount(): number {
    return this.queue.length;
  }

  /** Java `itList.isEmpty()`. */
  isEmpty(): boolean {
    return this.queue.length < 1;
  }

  /** Java `itList.select(int ix)`: null when out of range. */
  select(ix: number): string | null {
    if (ix < 0 || ix >= this.queue.length) {
      return null;
    }
    return this.queue[ix];
  }

  /** Java `itList.find(String id)`. */
  find(id: string | null): string | null {
    for (let ix = 0; ix < this.queue.length; ix++) {
      if (StaticList.isMatch(this.queue[ix], id)) {
        return this.queue[ix];
      }
    }
    return null;
  }

  /** Java `itList.firstOf(String id)`: index of the matching name, or -1. */
  firstOf(id: string): number {
    for (let ix = 0; ix < this.queue.length; ix++) {
      if (StaticList.isMatch(this.queue[ix], id)) {
        return ix;
      }
    }
    return -1;
  }

  /** Java `itList.contains(String id)`. */
  contains(id: string): boolean {
    return this.find(id) != null;
  }

  /** Java `itList.merge(String[])` / `itList.append(String)`: adds leaf tokens. */
  merge(list: readonly string[]): void {
    for (const it of list) {
      this.queue.push(it);
    }
  }

  /**
   * Java `itList.toString(int depth)` for a list whose entries are all leaf
   * `itToken`s (icon ""): `{~|Name|a|b|c|d|e\n\tf|...}` -- the sixth entry in a
   * row starts a new tab-indented line.
   */
  toString(depth = 0): string {
    const head = `${'\t'.repeat(depth)}{~|${this.id}`;
    let result = head;
    let count = 0;
    for (const it of this.queue) {
      result += '|';
      count += 1;
      if (count >= 6) {
        result += `\n${'\t'.repeat(depth + 1)}${it}`;
        count = 0;
      } else {
        result += it;
      }
    }
    return `${result}}`;
  }

  /** Java `String.equalsIgnoreCase` for the ASCII names used by the game data. */
  private static isMatch(name: string, id: string | null): boolean {
    if (id == null) {
      return false;
    }
    return name.toLowerCase() === id.toLowerCase();
  }
}
