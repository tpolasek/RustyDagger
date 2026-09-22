/*
 * Ported from DCourt/Tools/Buffer.java -- the tokenizer behind the item
 * (de)serializer (`Item.factory(Buffer)`), used by every screen/save file parser.
 *
 * Port notes:
 * - Java `char` math becomes code-unit numbers (`charCodeAt` / `String.fromCharCode`).
 * - Java's `charAt` returning 0 for an out-of-range read is preserved (`charAt`).
 * - Java's `String.trim()` (which strips code units <= 32) is preserved rather than
 *   JS `.trim()` (which also strips NBSP and other Unicode spaces).
 * - Java's substrings throw `StringIndexOutOfBoundsException` on bad ranges; the JS
 *   `substring` clamp is used instead so a malformed save cannot kill the page.
 */

const OPEN_SYMBOL = 0x7b; // '{'
const DIVIDE_SYMBOL = 0x7c; // '|'
const CLOSE_SYMBOL = 0x7d; // '}'

/** Java `String.trim()`: removes leading/trailing code units <= ' '. */
function javaTrim(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) <= 32) {
    start++;
  }
  while (end > start && text.charCodeAt(end - 1) <= 32) {
    end--;
  }
  return text.substring(start, end);
}

/** Java `Integer.parseInt`: returns 0 when the token is not a 32-bit int. */
function javaParseInt(text: string): number {
  const token = javaTrim(text);
  if (!/^[+-]?[0-9]+$/.test(token)) {
    return 0;
  }
  const value = Number(token);
  if (!Number.isSafeInteger(value) || value > 2147483647 || value < -2147483648) {
    return 0;
  }
  return value;
}

export class Buffer {
  private text: string;
  private pos: number; // Java field `index`; renamed: TS has no field/method overloading
  private mark: number;
  private size: number;

  constructor(s = '') {
    this.size = s.length;
    this.text = s;
    this.mark = 0;
    this.pos = 0;
  }

  reset(): void {
    this.mark = 0;
    this.pos = 0;
  }

  /** Java `toString()` / `toString(int sx)` / `toString(int sx, int ex)`. */
  toString(sx?: number, ex?: number): string {
    if (sx === undefined) {
      return this.text;
    }
    if (ex === undefined) {
      return this.text.substring(sx);
    }
    return this.text.substring(sx, ex);
  }

  peek(num?: number): string {
    if (num === undefined) {
      return this.toString(this.pos);
    }
    let max = this.pos + num;
    if (max >= this.size) {
      max = this.size;
    }
    return this.toString(this.pos, max);
  }

  private charAt(ix: number): number {
    if (ix < 0 || ix >= this.size) {
      return 0;
    }
    return this.text.charCodeAt(ix);
  }

  /** Java `length()` / `length(int len)` (the setter only ever shrinks `size`). */
  length(len?: number): number {
    if (len !== undefined && len > 0 && len < this.size) {
      this.size = len;
    }
    return this.size;
  }

  isDone(): boolean {
    return this.pos >= this.size;
  }

  index(): number {
    return this.pos;
  }

  advance(val: number): void {
    this.pos += val;
  }

  space(): number {
    return this.size - this.pos;
  }

  set(ix: number): void {
    this.pos = ix;
  }

  /** Java `getChar(int ix)` (non-advancing) / `getChar()` (advancing). */
  getChar(ix?: number): number {
    if (ix === undefined) {
      if (this.pos >= this.size) {
        return 0;
      }
      const i = this.pos;
      this.pos = i + 1;
      return this.charAt(i);
    }
    return this.charAt(ix);
  }

  isError(): boolean {
    if (this.text.length < 6) {
      return false;
    }
    return this.text.substring(0, 6).toLowerCase() === 'error:';
  }

  begin(): boolean {
    return this.getOpen();
  }

  end(): boolean {
    return this.getClose();
  }

  split(): boolean {
    return this.getDivide();
  }

  trim(): void {
    this.skipWhite();
  }

  token(): string {
    return this.getToken();
  }

  num(): number {
    return this.getNumber();
  }

  line(): string {
    return this.getLine();
  }

  match(val: string | null): boolean {
    if (val == null) {
      return false;
    }
    this.setMark();
    if (val === this.getToken()) {
      return true;
    }
    this.goMark();
    return false;
  }

  skipWhite(): void {
    while (this.pos < this.size && this.charAt(this.pos) <= 32) {
      this.pos++;
    }
  }

  getOpen(): boolean {
    this.skipWhite();
    if (this.charAt(this.pos) !== OPEN_SYMBOL) {
      return false;
    }
    this.pos++;
    return true;
  }

  getDivide(): boolean {
    this.skipWhite();
    if (this.charAt(this.pos) !== DIVIDE_SYMBOL) {
      return false;
    }
    this.pos++;
    return true;
  }

  getClose(): boolean {
    this.skipWhite();
    if (this.charAt(this.pos) !== CLOSE_SYMBOL) {
      return false;
    }
    this.pos++;
    return true;
  }

  setMark(): void {
    this.mark = this.pos;
  }

  goMark(): void {
    this.pos = this.mark;
  }

  getToken(): string {
    this.skipWhite();
    if (this.pos >= this.size) {
      return '';
    }
    const start = this.pos;
    let c = 0;
    while (
      this.pos < this.size &&
      (c = this.charAt(this.pos)) !== OPEN_SYMBOL &&
      c !== DIVIDE_SYMBOL &&
      c !== CLOSE_SYMBOL
    ) {
      this.pos++;
    }
    return javaTrim(this.toString(start, this.pos));
  }

  getNumber(): number {
    return javaParseInt(this.getToken());
  }

  isEmpty(): boolean {
    return this.size < 1;
  }

  startsWith(s: string): boolean {
    this.skipWhite();
    return this.text.startsWith(s, this.pos);
  }

  /**
   * Java: `return this.text.indexOf(this.pos, c);` -- the two arguments resolve to
   * `String.indexOf(int ch, int fromIndex)`, i.e. it searches for the code unit equal
   * to the *current index* starting at offset `c`. Kept verbatim (see getLine).
   */
  indexOf(c: number): number {
    const ch = this.pos;
    for (let ix = c; ix < this.text.length; ix++) {
      if (this.text.charCodeAt(ix) === ch) {
        return ix;
      }
    }
    return -1;
  }

  /** Java `getLine()`, including the `indexOf` quirk documented above. */
  getLine(): string {
    let ix = this.indexOf('\n'.charCodeAt(0));
    if (ix < 0) {
      ix = this.size;
    }
    const result = this.toString(this.pos, ix);
    this.pos = ix;
    return javaTrim(result);
  }
}
