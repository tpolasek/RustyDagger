/**
 * Barrel for the `Screens/Command` group (+ the utility status screen this group
 * owns) - and the single import that wires those screens into the Control layer.
 *
 * `Control/Player` and `Control/ScreenRegistry` never import `Screens/*`: the
 * Player's exit/notice/error screens and the status screen are resolved through
 * registration instead.  Those registrations live in `./arLoading` (the module
 * `main.ts` boots with), so importing *either* `./arLoading` or this barrel is
 * enough to wire the game up.
 *
 * `main.ts` wiring:
 *
 *   import { arLoading } from "./DCourt/Screens/Command";  // registers too
 *   setRegion(new arLoading());                            // loads, then arEntry
 */

export { arBuild } from "./arBuild";
export { arCreate } from "./arCreate";
export { arEntry } from "./arEntry";
export { arError } from "./arError";
export { arExit } from "./arExit";
export { arFinish } from "./arFinish";
export { arLoading } from "./arLoading";
export { arRanking } from "./arRanking";

/** Status screen (`Utility/arStatus`): registered as the status-strip factory. */
export { arStatus } from "../Utility/arStatus";
