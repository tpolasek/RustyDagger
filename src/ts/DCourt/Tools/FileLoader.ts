/*
 * Ported from DCourt/Tools/FileLoader.java -- hero persistence.
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

const ACCOUNT_PREFIX = 'RustyDagger.account.';

const VERSION_KEY = 'RustyDagger.version';

const SAVE_VERSION = '2';

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
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

  keys(): string[] {
    return [...this.map.keys()];
  }
}

const memoryStore = new MemoryStore();

function pickStore(): KeyValueStore {
  try {
    const ls = (
      globalThis as {
        localStorage?: StorageLike;
      }
    ).localStorage;
    if (
      ls != null &&
      typeof ls.getItem === 'function' &&
      typeof ls.setItem === 'function' &&
      typeof ls.removeItem === 'function'
    ) {
      const probe = `${HERO_PREFIX}__probe__`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return {
        getItem: (key) => ls.getItem(key),
        setItem: (key, value) => ls.setItem(key, value),
        removeItem: (key) => ls.removeItem(key),
        keys: () => {
          const out: string[] = [];
          for (let ix = 0; ix < ls.length; ix++) {
            const key = ls.key(ix);
            if (key !== null) out.push(key);
          }
          return out;
        },
      };
    }
  } catch {
    // localStorage throws in some privacy modes -- fall through to memory.
  }
  return memoryStore;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

function hashPassword(pass: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let ix = 0; ix < pass.length; ix++) {
    const c = pass.charCodeAt(ix);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((c + 7) & 0xffff), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

/** Java `e.getMessage()`; the ported errors are plain strings. */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class FileLoader extends Loader {
  private static serverBase: string | null = null;

  private static readonly heroCache = new Map<string, string>();

  private static readonly heroListeners = new Map<string, Array<(text: string) => void>>();

  private static findValues: string | null = null;

  static override cgiBuffer(action: string, data: string): Buffer {
    return new Buffer(FileLoader.cgi(action, data));
  }

  /** Java `LocalDate.now().format("yyyy-MM-dd")` (local time). */
  private static getToday(): string {
    const now = new Date();
    const yyyy = `${now.getFullYear()}`;
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  }

  static async probeServer(): Promise<boolean> {
    try {
      const res = await fetch('api/ping', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean };
      if (res.ok && data.ok === true) {
        FileLoader.serverBase = '';
        return true;
      }
    } catch {
    }
    return false;
  }

  static isServerMode(): boolean {
    return FileLoader.serverBase !== null;
  }

  static async login(name: string, pass: string): Promise<'created' | 'ok' | 'wrong' | 'error'> {
    if (FileLoader.serverBase === null) {
      if (!FileLoader.hasAccount(name)) {
        FileLoader.createAccount(name, pass);
        return 'created';
      }
      return FileLoader.checkPassword(name, pass) ? 'ok' : 'wrong';
    }
    try {
      const res = await fetch('api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, digest: hashPassword(pass) }),
      });
      const data = (await res.json()) as { status?: string };
      if (data.status === 'created' || data.status === 'ok') {
        return data.status;
      }
      return 'wrong';
    } catch (e) {
      log(`login failed for ${name}: ${errorMessage(e)}`);
      return 'error';
    }
  }

  static async fetchHero(name: string): Promise<Buffer> {
    if (FileLoader.serverBase === null) {
      return FileLoader.loadHero(name);
    }
    let text = '';
    try {
      const res = await fetch(`api/hero/${encodeURIComponent(name)}`, { cache: 'no-store' });
      if (res.ok) {
        text = await res.text();
      }
    } catch (e) {
      log(`Failed to load Hero ${name}: ${errorMessage(e)}`);
    }
    FileLoader.heroCache.set(name, text);
    const listeners = FileLoader.heroListeners.get(name);
    if (listeners) {
      FileLoader.heroListeners.delete(name);
      for (const cb of listeners) cb(text);
    }
    return new Buffer(text);
  }

  static hasCached(name: string): boolean {
    return FileLoader.heroCache.has(name);
  }

  static whenHeroLoaded(name: string, cb: (text: string) => void): void {
    if (FileLoader.heroCache.has(name)) {
      cb(FileLoader.heroCache.get(name) ?? '');
      return;
    }
    const list = FileLoader.heroListeners.get(name) ?? [];
    list.push(cb);
    FileLoader.heroListeners.set(name, list);
    void FileLoader.fetchHero(name);
  }

  /** Java `loadHero`: missing hero -> empty buffer, failure -> `Error: ...`. */
  static loadHero(name: string): Buffer {
    if (FileLoader.serverBase !== null) {
      const cached = FileLoader.heroCache.get(name);
      if (cached === undefined) {
        void FileLoader.fetchHero(name);
        return new Buffer('');
      }
      return new Buffer(cached);
    }
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
    if (FileLoader.serverBase !== null) {
      FileLoader.heroCache.set(name, data);
      void fetch(`api/hero/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: data,
      }).catch((e) => log(`Failed to save Hero ${name}: ${errorMessage(e)}`));
      return new Buffer('');
    }
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
      return FileLoader.findValues ?? `${FileLoader.getToday()}|0||`;
    }
    log(`${action} not implemented`);
    return `Error: ${action} not implemented`;
  }

  static hasAccount(name: string): boolean {
    try {
      return pickStore().getItem(ACCOUNT_PREFIX + name) !== null;
    } catch (e) {
      log(`Failed to read account ${name}: ${errorMessage(e)}`);
      return false;
    }
  }

  static createAccount(name: string, pass: string): void {
    pickStore().setItem(ACCOUNT_PREFIX + name, hashPassword(pass));
  }

  static checkPassword(name: string, pass: string): boolean {
    const stored = pickStore().getItem(ACCOUNT_PREFIX + name);
    return stored !== null && stored === hashPassword(pass);
  }

  static wipeSaves(): number {
    const store = pickStore();
    const doomed = store.keys().filter((key) => key.startsWith('RustyDagger.'));
    for (const key of doomed) {
      store.removeItem(key);
    }
    return doomed.length;
  }

  static migrateSaveVersion(): void {
    const store = pickStore();
    if (store.getItem(VERSION_KEY) === SAVE_VERSION) {
      return;
    }
    const wiped = FileLoader.wipeSaves();
    store.setItem(VERSION_KEY, SAVE_VERSION);
    if (wiped > 0) {
      log(`Migrated saves to version ${SAVE_VERSION}: wiped ${wiped} old key(s)`);
    }
  }

  static async migrate(): Promise<void> {
    if (FileLoader.serverBase === null) {
      FileLoader.migrateSaveVersion();
      return;
    }
    FileLoader.wipeSaves();
    try {
      await fetch('api/migrate', { cache: 'no-store' });
    } catch (e) {
      log(`migrate failed: ${errorMessage(e)}`);
    }
  }

  static async fetchFind(name: string): Promise<void> {
    if (FileLoader.serverBase === null) {
      return;
    }
    try {
      const res = await fetch(`api/find/${encodeURIComponent(name)}`, { cache: 'no-store' });
      if (res.ok) {
        FileLoader.findValues = await res.text();
      }
    } catch (e) {
      log(`find failed for ${name}: ${errorMessage(e)}`);
    }
  }

  static async sendMail(
    from: string,
    dest: string,
    label: string,
    contents: string
  ): Promise<string | null> {
    if (FileLoader.serverBase === null) {
      return null;
    }
    try {
      const res = await fetch('api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, dest, label, contents }),
      });
      const text = await res.text();
      return text.startsWith('Error:') ? text : null;
    } catch (e) {
      return `Error: ${errorMessage(e)}`;
    }
  }

  static async listMail(name: string): Promise<Array<{ id: number; label: string }>> {
    if (FileLoader.serverBase === null) {
      return [];
    }
    try {
      const res = await fetch(`api/mail/list/${encodeURIComponent(name)}`, { cache: 'no-store' });
      return res.ok ? ((await res.json()) as Array<{ id: number; label: string }>) : [];
    } catch (e) {
      log(`listMail failed: ${errorMessage(e)}`);
      return [];
    }
  }

  static async takeMail(name: string, id: number): Promise<Buffer> {
    try {
      const res = await fetch('api/mail/take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, id }),
      });
      return new Buffer(res.ok ? await res.text() : 'Error: no such mail');
    } catch (e) {
      return new Buffer(`Error: ${errorMessage(e)}`);
    }
  }

  static async peekClan(clan: string): Promise<string> {
    if (FileLoader.serverBase === null) {
      return '';
    }
    try {
      const res = await fetch(`api/clan/${encodeURIComponent(clan)}`, { cache: 'no-store' });
      return res.ok ? await res.text() : '';
    } catch (e) {
      log(`peekClan failed: ${errorMessage(e)}`);
      return '';
    }
  }

  static async makeClan(name: string, clan: string): Promise<string | null> {
    return FileLoader.clanMutation('api/clan/make', name, clan);
  }

  static async killClan(name: string, clan: string): Promise<string | null> {
    return FileLoader.clanMutation('api/clan/kill', name, clan);
  }

  private static async clanMutation(
    url: string,
    name: string,
    clan: string
  ): Promise<string | null> {
    if (FileLoader.serverBase === null) {
      return null;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, clan }),
      });
      const text = await res.text();
      return text.startsWith('Error:') ? text : null;
    } catch (e) {
      return `Error: ${errorMessage(e)}`;
    }
  }

  static async fetchRankings(): Promise<string | null> {
    if (FileLoader.serverBase === null) {
      return null;
    }
    try {
      const res = await fetch('api/rank', { cache: 'no-store' });
      return res.ok ? await res.text() : null;
    } catch (e) {
      log(`fetchRankings failed: ${errorMessage(e)}`);
      return null;
    }
  }

  static saveScore(name: string, rank: string): void {
    if (FileLoader.serverBase === null) {
      return;
    }
    void fetch('api/rank/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rank }),
    }).catch((e) => log(`saveScore failed: ${errorMessage(e)}`));
  }
}
