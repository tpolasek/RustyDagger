/**
 * Screen registration hub for the screens the Control layer has to launch.
 *
 * The Java Control code reached into the Screens package directly:
 *
 *   - `PlaceTable.getLaunch()` used `Class.forName("DCourt.Screens." + launch).newInstance()`
 *     (`PlaceTable.java:55`), i.e. a string-keyed lookup resolved by the JVM class loader.
 *   - `Player.tryToExit()` built `new arExit(from, loc)` and `Player.errorScreen()` built
 *     `new arNotice(...)` / `new arError(...)` (`Player.java:203-245`).
 *
 * A literal port would make Control import the whole Screens tree at runtime, which creates the
 * cycles `Player -> arExit -> arNotice -> Screen -> Tools -> Player` and
 * `MonsterTable -> Quests`-style Screens data references. ESM/bundler module graphs resolve such
 * cycles badly (class declarations sit in the temporal dead zone), so this module replaces both
 * mechanisms with an explicit registration/factory table.
 *
 * This file deliberately imports nothing from `Screens/` or `Items/` (only the `log` seam in
 * `Tools/Loader`, which itself imports nothing but `Tools/Buffer`), so anything may import it
 * without adding a cycle edge. Screens register themselves, e.g. from a
 * bootstrap module that imports the screen classes:
 *
 *   import { registerScreenClass, registerPlayerScreens } from '../Control/ScreenRegistry';
 *   import { arTown } from './Areas/arTown';
 *   import { arExit } from './Command/arExit';
 *   ...
 *   registerScreenClass('Areas.arTown', arTown);
 *   registerPlayerScreens({ exit: (from, loc) => new arExit(from, loc) });
 *
 * or from the top level of an individual screen module ("screens register themselves"). Anything
 * that is not registered degrades to a `null` screen plus a `console.error`, never a crash:
 * getting to a screen without a registration is a wiring bug, not a gameplay state.
 */

import { log } from '../Tools/Loader';
import type { Screen } from '../ui/screen';

/**
 * Alias of the ported `Screen` class (`ui/screen.ts`, Java `DCourt.Screens.Screen`).
 *
 * Control never calls into a screen - it only stores the reference and hands it on to
 * `Tools.setRegion(next)`, `new arNotice(from, ...)`, etc. - so the only thing this layer needs
 * from the UI is the type. The import is `import type`, which TypeScript erases, so Control gains
 * no runtime edge into `ui/` (or `Screens/`) and the registration graph below stays acyclic.
 *
 * `ScreenRef` is kept as a named alias so the boundary is a single line if the UI type ever has to
 * be swapped out again (e.g. back to a local permissive alias while `ui/screen.ts` is in flux).
 */
export type ScreenRef = Screen;

/** Zero-argument screen construction, i.e. Java `Class.newInstance()` for a launch name. */
export type ScreenFactory = () => ScreenRef;

/** A screen class (constructor) usable for launch-name registration. */
export type ScreenConstructor = new () => ScreenRef;

/* ---------------------------------------------------------------------------------------- *
 * Launch-name registry: replaces `Class.forName("DCourt.Screens." + launch).newInstance()`
 * ---------------------------------------------------------------------------------------- */

const launches = new Map<string, ScreenFactory>();

/**
 * Register the screen launched for a PlaceTable launch name (e.g. `"Areas.arTown"`,
 * `"Wilds.arField"`). Later registrations replace earlier ones.
 */
export function registerScreen(launch: string, factory: ScreenFactory): void {
  launches.set(launch, factory);
}

/** Convenience wrapper: registers a no-arg screen constructor (`new ScreenCtor()`). */
export function registerScreenClass(launch: string, ctor: ScreenConstructor): void {
  registerScreen(launch, () => new ctor());
}

/** Registers every entry of a `{ launchName: factory }` map. */
export function registerScreens(screens: Record<string, ScreenFactory>): void {
  for (const launch of Object.keys(screens)) {
    registerScreen(launch, screens[launch]);
  }
}

export function unregisterScreen(launch: string): void {
  launches.delete(launch);
}

export function hasScreen(launch: string | null): boolean {
  return launch != null && launches.has(launch);
}

/** Registered launch names, in registration order (used by diagnostics/tests). */
export function registeredScreens(): string[] {
  return [...launches.keys()];
}

/** Drops every registration (tests only). */
export function clearScreens(): void {
  launches.clear();
}

/**
 * Instantiates the registered screen for a launch name.
 *
 * Mirrors `PlaceTable.getLaunch()` (`PlaceTable.java:48-63`): log the launch, and on any failure
 * (unknown name / constructor threw) log the error and return `null` instead of propagating.
 */
export function resolveScreen(launch: string | null): ScreenRef | null {
  if (launch == null) {
    return null;
  }
  const factory = launches.get(launch);
  if (factory == null) {
    console.error(`PlaceTable.getLaunch(): no screen registered for [${launch}]`);
    return null;
  }
  try {
    log(`Launch ${launch} screen`);
    return factory();
  } catch (ex) {
    console.error(`PlaceTable.getLaunch(): ${ex}`);
    return null;
  }
}

/* ---------------------------------------------------------------------------------------- *
 * Player screen factories: replaces the direct `new arExit/arNotice/arError` in Player.java
 * ---------------------------------------------------------------------------------------- */

/**
 * The three screens `Player` constructs. Declared as factories rather than imported classes so
 * `Player.ts` never imports `Screens/`.
 *
 *   exit   - Java `new arExit(from, loc)`            Command/arExit.ts   (positional arg `loc`)
 *   notice - Java `new arNotice(from, msg)`          Utility/arNotice.ts
 *   error  - Java `new arError(msg)`                 Command/arError.ts
 */
export interface PlayerScreenFactories {
  exit: (from: ScreenRef | null, loc: string) => ScreenRef;
  notice: (from: ScreenRef | null, msg: string) => ScreenRef;
  error: (msg: string) => ScreenRef;
}

const playerScreens: Partial<PlayerScreenFactories> = {};

/** Registers any subset of the Player screens; screens may register as they are ported. */
export function registerPlayerScreens(screens: Partial<PlayerScreenFactories>): void {
  Object.assign(playerScreens, screens);
}

export function hasExitScreen(): boolean {
  return playerScreens.exit != null;
}

export function hasNoticeScreen(): boolean {
  return playerScreens.notice != null;
}

export function hasErrorScreen(): boolean {
  return playerScreens.error != null;
}

/** Drops every Player screen registration (tests only). */
export function clearPlayerScreens(): void {
  delete playerScreens.exit;
  delete playerScreens.notice;
  delete playerScreens.error;
}

/** Java `new arExit(from, loc)` (`Player.java:204`). */
export function getExitScreen(from: ScreenRef | null, loc: string): ScreenRef | null {
  const make = playerScreens.exit;
  if (make == null) {
    console.error('Player.tryToExit(): no exit screen registered (Command/arExit)');
    return null;
  }
  return make(from, loc);
}

/** Java `new arNotice(from, msg)` (`Player.java:215-236`). */
export function getNoticeScreen(from: ScreenRef | null, msg: string): ScreenRef | null {
  const make = playerScreens.notice;
  if (make == null) {
    console.error('Player.errorScreen(): no notice screen registered (Utility/arNotice)');
    return null;
  }
  return make(from, msg);
}

/** Java `new arError(msg)` (`Player.java:238-243`). */
export function getErrorScreen(msg: string): ScreenRef | null {
  const make = playerScreens.error;
  if (make == null) {
    console.error('Player.errorScreen(): no error screen registered (Command/arError)');
    return null;
  }
  return make(msg);
}
