/**
 * Template barrel - the abstract screen templates shared by the Area screens.
 *
 *   Indoors      base of every indoor screen (greeting + face portraits)
 *   Shop         buy/sell list mechanics
 *   Smith        arms-dealer variant (single Transact button, Identify)
 *   Trade        commodity variant (1 / 10 / 100 / 1K quantity buttons)
 *   Transfer     two-list purse/stash transfer screen
 *   WildsScreen  wilderness map + quest selection mechanics
 *
 * None of these carry a `PlaceTable` launch name - registration lives with the
 * concrete screens (see `../Wilds/index.ts` for this folder's group).
 */

export * from "./Indoors";
export * from "./Shop";
export * from "./Smith";
export * from "./Trade";
export * from "./Transfer";
export * from "./WildsScreen";
