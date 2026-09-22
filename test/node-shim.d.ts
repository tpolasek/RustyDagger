/*
 * Minimal ambient declarations for the node built-ins used under `test/`.
 *
 * The project deliberately keeps `devDependencies` down to `typescript` +
 * `esbuild` (no runtime deps), so `@types/node` is not installed and
 * `tsc -p tsconfig.test.json` would report TS2307 for `node:test` /
 * `node:assert/strict`.  Only the members the tests actually call are declared
 * here; the runtime modules themselves come from node (v25.x per the plan).
 *
 * This file is a global script (no top-level import/export), so the
 * `declare module` blocks below are ambient module declarations.
 */

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function before(fn: () => void | Promise<void>): void;
  export function after(fn: () => void | Promise<void>): void;
}

declare module "node:assert/strict" {
  export function ok(value: unknown, message?: string): void;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function strictEqual(actual: unknown, expected: unknown, message?: string): void;
  export function notStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  export function match(value: string, regExp: RegExp, message?: string): void;
  export function throws(fn: () => unknown, message?: string): void;
  export function doesNotThrow(fn: () => unknown, message?: string): void;
  export function fail(message?: string): never;
}
