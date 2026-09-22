/**
 * Compatibility re-export of the base screen class.
 *
 * Java's base panel is `DCourt.Screens.Screen`; the DOM port implements it in
 * `../ui/screen` because the UI layer must never import `Screens/*` (see the
 * dependency notes at the top of `ui/index.ts`).  This module keeps the Java
 * path working, so a ported screen (or a test) may write
 *
 *   import { Screen } from "../Screen";     // just like `DCourt.Screens.Screen`
 *
 * and thereby pick up the subclasses' `Screen` too:
 *
 *   class arFoo extends Screen { ... }
 *
 * Every screen currently under `Screens/` imports `../ui/screen` directly
 * (that is the shortest path and the one documented in `ui/index.ts`); this
 * alias module exists for call sites that mirror the Java import instead.
 */

export { Screen } from "../ui/screen";
