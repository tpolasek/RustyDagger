/*
 * Ported from DCourt/Tools/Loader.java -- the CGI/network layer.
 *
 * Parity note (port plan): multiplayer stays stubbed. `Loader.cgi` in the Java source
 * already returns `""` for every action (the URL post is commented out there), and this
 * port keeps that exactly, so `cgiBuffer` is always an empty buffer and `cgiItem` is
 * always null (`Item.factory("") === null`). `FileLoader` overrides `cgi` with the local
 * `FINDHERO` answer.
 *
 * Dropped as dead, JVM-only code: `operate(URL, String)`, `getBytes`, `newLoad` and
 * `oldLoad` (java.net/java.io, only reachable through the disabled CGI body).
 * `encrypt`/`decrypt` are pure and are kept.
 *
 * `System.out.println` is replaced by the thin `log` util (port plan).
 */

import { Buffer } from './Buffer';

/** Replaces `System.out.println`; the single logging seam of the ported tools. */
export function log(message: string): void {
  console.log(message);
}

/**
 * Java `DCourt.Items.Item`. The Items port does not exist yet, so `cgiItem` is a
 * generic passthrough: call it as `Loader.cgiItem<Item>(...)` once Items lands (the
 * result is always null under the stub, exactly as in Java).
 */
export class Loader {
  static readonly FINDHERO = 'dbFind';
  static readonly SAVEHERO = 'dbSaveIt';
  static readonly READHERO = 'dbLoad';
  static readonly READRANK = 'dbRank';
  static readonly SAVESCORE = 'dbScore';
  static readonly SENDMAIL = 'dbMail';
  static readonly TAKEMAIL = 'dbTake';
  static readonly LISTMAIL = 'dbList';
  static readonly MESSAGE = 'dbMessage';
  static readonly PEEKCLAN = 'dbPeekClan';
  static readonly MAKECLAN = 'dbMakeClan';
  static readonly KILLCLAN = 'dbKillClan';

  private text: string = '';

  static cgiBuffer(action: string, data: string): Buffer {
    return new Buffer(Loader.cgi(action, data));
  }

  /**
   * Java: `return Item.factory(cgi(action, data));` -- the stub CGI always answers ""
   * and `Item.factory("")` is null, so this is always null in the ported build.
   */
  static cgiItem<T = unknown>(action: string, data: string): T | null {
    Loader.cgi(action, data);
    return null;
  }

  static cgi(action: string, data: string): string {
    log(`${action} : ${data}`);
    return '';
    /*
     * Java then posts to the CGI binary (DCourt/Tools/Loader.java:38-60) -- the body is
     * commented out in the Java source as well:
     *
     *   return operate(
     *       new URL(Tools.getCgibin() + "/" + "DCcgi17.exe" + "?cfg=" + Tools.getConfig()
     *               + "&act=" + action),
     *       data).trim();
     */
  }

  getText(): string {
    return this.text;
  }

  isError(): boolean {
    return this.text.startsWith('Error:');
  }

  /** Java `encrypt(String)`: pure, kept for the disabled CGI payload encoding. */
  static encrypt(from: string): string {
    let result = '';
    const size = from.length;
    let dx = 0;
    for (let ix = 0; ix < size; ix++) {
      const temp = (from.charCodeAt(ix) + 128) & 127;
      if (temp < 32) {
        result += String.fromCharCode(temp);
      } else {
        result += String.fromCharCode((((temp - 32) + ((size + dx) % 96)) % 96) + 32);
        dx++;
      }
    }
    return result;
  }

  /** Java `decrypt(String)`: pure, inverse of `encrypt`. */
  static decrypt(from: string): string {
    let result = '';
    const size = from.length;
    let dx = 0;
    for (let ix = 0; ix < size; ix++) {
      const temp = (from.charCodeAt(ix) + 128) & 127;
      if (temp < 32) {
        result += String.fromCharCode(temp);
      } else {
        result += String.fromCharCode((((((temp - 32) + 96) - ((size + dx) % 96)) % 96)) + 32);
        dx++;
      }
    }
    return result;
  }
}
