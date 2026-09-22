/**
 * arLoading - the DOM port of `DCourt.Screens.Command.arLoading`.
 *
 * Java drove the load from the paint callback: every repaint advanced `stage`
 * and called `Tools.isLoading(stage)` (`Tools.java:61-88`), which loaded one image
 * or built one table per stage, then handed over to `arEntry` when it finally
 * returned false.  A paint callback cannot await the network, so the port turns
 * the very same stage list into an async sequence: image stages are awaited
 * (`Tools.preload`, the `HTMLImageElement.decode()` equivalent), the table stages
 * run synchronously, and the "Loading . . ." text is repainted between stages -
 * which is what the Java dots were counting.
 *
 *   stage 0  Splash.jpg
 *   stage 1  Faces/Hero.jpg + the shared status strip
 *   stage 2  PlaceTable      3  GearTable     4  ArmsTable
 *   stage 5  Player          6  MonsterTable
 *   stage 7  MonsterTable.isLoading() -> done, `setRegion(new arEntry())`
 *
 * This module is also the boot module's wiring point: `main.ts` always imports
 * `arLoading`, so the registrations at the bottom of the file (the Player's
 * exit/notice/error factories from `Control/ScreenRegistry`, the status screen
 * factory on `Tools`, and the ranking loader that `Tools.getRankings()` uses) are
 * guaranteed to be in place before the first hero loads - whichever module the
 * bootstrapper reaches for.
 */

import { ArmsTable } from "../../Control/ArmsTable";
import { GearTable } from "../../Control/GearTable";
import { MonsterTable } from "../../Control/MonsterTable";
import { PlaceTable } from "../../Control/PlaceTable";
import { Player, registerPlayerScreens } from "../../Control/Player";
import { COLORS } from "../../ui/dom";
import { Screen } from "../../ui/screen";
import { Loader } from "../../Tools/Loader";
import { Tools } from "../../Tools/Tools";
import { arNotice } from "../Utility/arNotice";
import { arStatus } from "../Utility/arStatus";
import { arEntry } from "./arEntry";
import { arError } from "./arError";
import { arExit } from "./arExit";

export class arLoading extends Screen {
  /** Java `int stage` - how many dots "Loading" has earned. */
  private stage = 0;
  /** The async sequence runs once, however often `init()` is called. */
  private started = false;

  constructor() {
    super("Loading");
    this.hideStatusBar();
  }

  /** Java `localPaint(Graphics)`: a white field and the progress text. */
  override localPaint(): void {
    this.fill(0, 0, Tools.DEFAULT_WIDTH, Tools.DEFAULT_HEIGHT, COLORS.white);
    this.label(this.progressText(), 20, 120, { font: Tools.bigF, color: COLORS.black });
  }

  /** Java's dot loop in `localPaint`. */
  private progressText(): string {
    let msg = "Loading";
    for (let ix = 0; ix < this.stage; ix++) {
      msg = msg.concat(" .");
    }
    return msg;
  }

  /** Java `init()` was the paint loop; the DOM starts the awaited sequence once. */
  override init(): void {
    super.init();
    if (!this.started) {
      this.started = true;
      void this.run();
    }
  }

  /** Mirror of Java's paint loop: paint, load, repaint, until a stage says "done". */
  private async run(): Promise<void> {
    for (let stage = 0; await this.loadStage(stage); stage++) {
      this.stage = stage + 1;
      this.repaint();
    }
    Tools.setRegion(new arEntry());
  }

  /**
   * Java `Tools.isLoading(int stage)` (`Tools.java:61-88`), one stage per call.
   * The two image stages await their bitmap; `false` means the world is ready.
   */
  private async loadStage(stage: number): Promise<boolean> {
    switch (stage) {
      case 0:
        await Tools.preload("Splash.jpg");
        return true;
      case 1:
        await Tools.preload("Faces/Hero.jpg");
        Tools.ensureStatusPic(); // Java: `statusPic = new StatusPic()`
        return true;
      case 2:
        Tools.setPlaceTable(new PlaceTable());
        return true;
      case 3:
        // Java kept the *static* table on Tools (`gear = new GearTable()`); the
        // ported GearTable builds its table in the constructor and the session
        // holds the class, because `Tools` only ever calls `find(...)` on it.
        new GearTable();
        Tools.setGearTable(GearTable);
        return true;
      case 4:
        new ArmsTable();
        return true;
      case 5:
        Tools.setPlayer(new Player());
        return true;
      case 6:
        new MonsterTable();
        Tools.setMonsterTable(MonsterTable);
        return true;
      default:
        return MonsterTable.isLoading();
    }
  }
}

/* ------------------------------------------------------------------- wiring *
 * Kept with the boot screen (see the module comment) so that importing either
 * `arLoading` or the `Screens/Command` barrel wires the game up.
 * ------------------------------------------------------------------------- */

/** `Player.java:203-243` built `arExit`/`arNotice`/`arError` directly; here the Player
 *  resolves them through `Control/ScreenRegistry`. */
registerPlayerScreens({
  exit: (from, loc) => new arExit(from, loc),
  notice: (from, msg) => new arNotice(from, msg),
  error: (msg) => new arError(msg),
});

/** `Screen.action` opens the hero status screen when the status strip is clicked. */
Tools.setStatusScreenFactory((from) => new arStatus(from));

/** `Tools.getRankings()` fetches the ranking file.  The CGI layer is stubbed
 *  (`Loader.cgi` returns ""), so `arRanking` digests five empty boards - the
 *  documented parity behaviour - rather than reporting an error. */
Tools.setRankingsLoader((who) => Loader.cgiBuffer(Loader.READRANK, who));
