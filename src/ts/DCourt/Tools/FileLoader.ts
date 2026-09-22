/*
 * Ported from DCourt/Tools/FileLoader.java -- hero persistence.
 *
 * Java reads/writes `File`s in the current directory; the browser build uses
 * `localStorage` under the keys `RustyDagger.hero.<name>`, with an in-memory fallback
 * (storage disabled, private mode, or plain Node) so tests can run headless.
 *
 * Java decodes the file as US-ASCII; the save format is ASCII only, and a JS string is
 * stored/returned verbatim here, which is byte-identical for that format. A non-ASCII
 * hero name or item name would behave differently (Java replaced the high bytes with
 * U+FFFD on load) -- the game data is ASCII, so this is not reachable in practice.
 *
 * `FileLoader.cgi` keeps Java's local answers: `FINDHERO` returns `<yyyy-MM-dd>|0||`,
 * everything else `Error: <action> not implemented`.
 */

import { Buffer } from './Buffer';
import { Loader, log } from './Loader';

/** localStorage key prefix for hero saves (port plan: `RustyDagger.hero.<name>`). */
const HERO_PREFIX = 'RustyDagger.hero.';

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Node/test fallback: same semantics as localStorage, lives for the process. */
class MemoryStore implements KeyValueStore {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    const value = this.map.get(key);
    return value === undefined ? null : value;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const memoryStore = new MemoryStore();

function pickStore(): KeyValueStore {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    if (
      ls != null &&
      typeof ls.getItem === 'function' &&
      typeof ls.setItem === 'function' &&
      typeof ls.removeItem === 'function'
    ) {
      const probe = `${HERO_PREFIX}__probe__`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // localStorage throws in some privacy modes -- fall through to memory.
  }
  return memoryStore;
}

/** Java `e.getMessage()`; the ported errors are plain strings. */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class FileLoader extends Loader {
  static override cgiBuffer(action: string, data: string): Buffer {
    return new Buffer(FileLoader.cgi(action, data));
  }

  /** Java `LocalDate.now().format("yyyy-MM-dd")` (local time). */
  private static getToday(): string {
    const now = new Date();
    const yyyy = `${now.getFullYear()}`;
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Java `loadHero`: missing hero -> empty buffer, failure -> `Error: ...`. */
  static loadHero(name: string): Buffer {
    let data: string | null;
    try {
      data = pickStore().getItem(HERO_PREFIX + name);
    } catch (e) {
      log(`Failed to load Hero ${name}: ${errorMessage(e)}`);
      return new Buffer(`Error: ${errorMessage(e)}`);
    }
    if (data == null) {
      log(`Hero ${name} file not found`);
      return new Buffer('');
    }
    return new Buffer(data);
  }

  /** Java `saveHero`: `""` on success, `Error: ...` on failure. */
  static saveHero(name: string, data: string): Buffer {
    try {
      pickStore().setItem(HERO_PREFIX + name, data);
      return new Buffer('');
    } catch (e) {
      log(`Failed to save Hero ${name}: ${errorMessage(e)}`);
      return new Buffer(`Error: ${errorMessage(e)}`);
    }
  }

  static override cgi(action: string, _data: string): string {
    if (action === Loader.FINDHERO) {
      log('FIND HERO');
      return `${FileLoader.getToday()}|0||`;
    }
    log(`${action} not implemented`);
    return `Error: ${action} not implemented`;
  }
}
