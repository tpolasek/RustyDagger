/*
 * Ported from DCourt/Tools/Breaker.java -- word wrap used where logic needs
 * measured lines (itText/arQuest text blocks).
 *
 * `java.awt.FontMetrics` does not exist in the browser: the ported UI layer supplies
 * a `FontMetrics` adapter (measured with a canvas 2D context). `charWidth` takes a
 * code unit (Java `FontMetrics.charWidth(char)`), not a string.
 *
 * Hazard: Java `breakText()` loops forever (and appends an empty line each pass) when a
 * single word is wider than `wide` -- no mark is ever set, so the overflow branch rewinds
 * to the line start. See the guard in `breakText()`; the port emits the remainder as one
 * over-long line instead of freezing the browser tab.
 */

import { Buffer } from './Buffer';

export interface FontMetrics {
  stringWidth(text: string): number;
  charWidth(code: number): number;
  getAscent(): number;
  getHeight(): number;
}

const TAB = '  ';

export class Breaker {
  private buf: Buffer;
  private wide: number;
  private tabWidth: number;
  private indent: boolean;
  private fm: FontMetrics | null;
  private lines: string[] = [];

  constructor(msg: string, fm: FontMetrics | null, wide: number, indent: boolean) {
    this.buf = new Buffer(msg);
    this.wide = wide;
    this.indent = indent;
    this.fm = fm;
    this.tabWidth = 0;
    if (fm != null) {
      this.tabWidth = fm.stringWidth(TAB);
      this.breakText();
    }
  }

  getText(): string {
    return this.buf.toString();
  }

  getFontMetrics(): FontMetrics | null {
    return this.fm;
  }

  getAscent(): number {
    if (this.fm === null) {
      // Java would throw a NullPointerException here.
      throw new Error('Breaker.getAscent(): no FontMetrics');
    }
    return this.fm.getAscent();
  }

  getHeight(): number {
    if (this.fm === null) {
      // Java would throw a NullPointerException here.
      throw new Error('Breaker.getHeight(): no FontMetrics');
    }
    return this.fm.getHeight();
  }

  breakText(): void {
    if (this.wide === 0 || this.fm === null) {
      return;
    }
    const fm = this.fm;
    let c = 0;
    let paragraph = true;
    while (!this.buf.isDone()) {
      const i = paragraph || !this.indent ? 0 : this.tabWidth;
      let pixels = i;
      // Java also tracks a `markPixels` here but never reads it; dropped.
      const start = this.buf.index();
      for (;;) {
        c = this.buf.getChar();
        if (c === 0 || c === 10 /* \n */) {
          break;
        }
        if (c !== 13 /* \r */) {
          pixels = c === 9 /* \t */ ? pixels + this.tabWidth : pixels + fm.charWidth(c);
          if (pixels > this.wide) {
            this.buf.goMark();
            break;
          }
          if (c <= 32) {
            this.buf.setMark();
          }
        }
      }
      const end = this.buf.index();
      if (end <= start) {
        /*
         * Deliberate deviation, documented: Java spins here forever. A word wider than
         * `wide` never sets a mark, so the overflow branch rewinds to the line start and
         * the state repeats -- Java appends empty lines until the JVM runs out of memory.
         * The loop state is identical every iteration (index, mark, paragraph all
         * unchanged), so no terminating Java case is affected by stopping here: emit the
         * rest of the buffer as a single over-long line instead of freezing the tab.
         */
        let rest = paragraph || !this.indent ? '' : TAB;
        for (let ix = start; ix < this.buf.length(); ix++) {
          const code = this.buf.getChar(ix);
          if (code !== 13 /* \r */) {
            rest += code === 9 /* \t */ ? TAB : String.fromCharCode(code);
          }
        }
        this.buf.set(this.buf.length());
        this.lines.push(rest);
        break;
      }
      let msg = paragraph || !this.indent ? '' : TAB;
      for (let ix = start; ix < end; ix++) {
        c = this.buf.getChar(ix);
        if (c === 0 || c === 10) {
          break;
        }
        if (c !== 13) {
          msg += c === 9 ? TAB : String.fromCharCode(c);
        }
      }
      paragraph = c === 10;
      this.lines.push(msg);
    }
  }

  lineCount(): number {
    return this.lines.length;
  }

  getLine(index: number): string | null {
    if (index < 0 || index >= this.lines.length) {
      return null;
    }
    return this.lines[index];
  }
}
