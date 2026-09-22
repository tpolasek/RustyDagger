/*
 * Ported from DCourt/Tools/MadLib.java -- `$HE$`-style substitution used by every
 * monster/quest text block (`itText`, `arQuest`).
 *
 * Java `Hashtable` becomes a `Map`; `clone()` is TS `clone()` (the Java
 * `Object.clone()` override is kept because itxt/arQuest copy text templates).
 */

export class MadLib {
  private gender: string[][];
  private table: Map<string, string>;
  private text: string;

  constructor(msg: string | MadLib) {
    this.gender = [
      ['$HE$', 'he', 'she'],
      ['$HIM$', 'him', 'her'],
      ['$HIS$', 'his', 'her'],
      ['$MAN$', 'man', 'woman'],
      ['$BOY$', 'boy', 'girl'],
    ];
    this.table = new Map<string, string>();
    this.text = '';
    if (msg instanceof MadLib) {
      // Java `new MadLib(MadLib)`: copies the replacement table and the text.
      this.table = new Map<string, string>(msg.table);
      this.text = msg.text;
      return;
    }
    this.append(msg);
    this.replace('$CR$', '\n');
    this.replace('$TB$', '\t');
    this.replace('$$', '$');
  }

  clone(): MadLib {
    return new MadLib(this);
  }

  /** Java returns `null` when the key is absent, so a null is returned here too. */
  getReplace(key: string): string | null {
    const val = this.table.get(key);
    return val === undefined ? null : val;
  }

  getText(): string {
    return this.update(this.text);
  }

  getFinal(): string {
    this.text = this.update(this.text);
    return this.text;
  }

  /** Java `replace(String, String)` / `replace(String, int)`. */
  replace(key: string, val: string | number): void {
    this.table.set(key, typeof val === 'number' ? `${val}` : val);
  }

  append(val: string): void {
    if (this.text == null) {
      this.text = '';
    }
    this.text = `${this.text}${val}`;
  }

  genderize(male: boolean): void {
    const sex = male ? 1 : 2;
    for (let ix = 0; ix < this.gender.length; ix++) {
      this.replace(this.gender[ix][0], this.gender[ix][sex]);
    }
  }

  capitalize(): void {
    const work = this.text.split('');
    let spaces = 0;
    for (let ix = 0; ix < this.text.length; ix++) {
      const code = this.text.charCodeAt(ix);
      if (code > 32) {
        if (spaces > 1 && code >= 97 /* a */ && code <= 122 /* z */) {
          work[ix] = String.fromCharCode(code - 97 + 65);
        }
        spaces = 0;
      } else {
        spaces++;
      }
    }
    this.text = work.join('');
  }

  private update(from: string): string {
    let result = '';
    let ix = 0;
    for (;;) {
      const dx = from.indexOf('$', ix);
      if (dx < 0) {
        break;
      }
      result += from.substring(ix, dx);
      ix = dx;
      const dx2 = from.indexOf('$', dx + 1);
      if (dx2 < 0) {
        break;
      }
      const sub = from.substring(ix, dx2 + 1);
      ix = dx2 + 1;
      const put = this.getReplace(sub);
      result += put == null ? sub : this.update(put);
    }
    return `${result}${from.substring(ix)}`;
  }
}
