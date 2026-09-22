/**
 * Barrel for the `Areas` screens owned by this port step (the town hub and the
 * queen's court).
 *
 * Java's `PlaceTable.getLaunch()` resolved `"Areas.arTown"` through the class
 * loader; the port resolves launch names through `Control/ScreenRegistry`, and
 * `arTown` registers itself when its module is evaluated.  Importing this
 * barrel is therefore enough to make the town reachable:
 *
 *   import { arTown } from "./Areas/areasIndex";
 *
 * The filename is `areasIndex.ts` (not `index.ts`) so it cannot collide with a
 * per-package barrel added by a parallel screen port.
 */

export { arTown } from "./arTown";
export { arQueen } from "./arQueen";
export { arArmour } from "./Town/arArmour";
export { arTavern } from "./Town/arTavern";
export { arTrader } from "./Town/arTrader";
export { arWeapon } from "./Town/arWeapon";
export { arqBoast } from "./Queen/arqBoast";
export { arqDice } from "./Queen/arqDice";
export { arqFlirt } from "./Queen/arqFlirt";
export { arqGame } from "./Queen/arqGame";
export { arqMingle } from "./Queen/arqMingle";
export { arqStudy } from "./Queen/arqStudy";
