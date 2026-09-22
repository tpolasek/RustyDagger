/**
 * Wilds barrel + launch registration.
 *
 * `PlaceTable` launches a screen for a place through an explicit registry
 * (`Control/ScreenRegistry.ts`), which replaced Java's
 * `Class.forName("DCourt.Screens." + launch).newInstance()`.  This folder owns
 * five of those launch names:
 *
 *   fields -> Wilds.arField     forest -> Wilds.arForest   mound -> Wilds.arMound
 *   hills  -> Wilds.arHills     docks/dunjeon -> Wilds.arCastle
 *
 * (`Areas.arTown`, used for suite/room/floor/town, belongs to the Areas group
 * and registers itself there.)
 *
 * Importing this module performs the registration; `registerWildsScreens()` is
 * exported as well so a bootstrap can be explicit (and re-registering is
 * harmless - later registrations simply replace earlier ones).
 */

import { registerScreenClass } from "../../Control/PlaceTable";
import { arCastle } from "./arCastle";
import { arField } from "./arField";
import { arForest } from "./arForest";
import { arHills } from "./arHills";
import { arMound } from "./arMound";

export * from "./arCastle";
export * from "./arField";
export * from "./arForest";
export * from "./arHills";
export * from "./arMound";

/** Registers the five `Wilds.*` PlaceTable launch names. */
export function registerWildsScreens(): void {
  registerScreenClass("Wilds.arField", arField);
  registerScreenClass("Wilds.arForest", arForest);
  registerScreenClass("Wilds.arMound", arMound);
  registerScreenClass("Wilds.arHills", arHills);
  registerScreenClass("Wilds.arCastle", arCastle);
}

registerWildsScreens();
