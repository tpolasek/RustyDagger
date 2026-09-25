/**
 * Image resource cache - the DOM replacement for `Tools.resourceTable` and
 * `Tools.loadImage` (`Tools.java:199-273`).
 *
 * Java cached `java.awt.Image` objects in a Hashtable keyed by the art path
 * ("Faces/Hero.jpg").  The browser equivalent caches `HTMLImageElement`
 * objects, which are live: setting `src` starts the network fetch and the
 * element is decoded in place, exactly like AWT's asynchronous image loading.
 * `preload()`/`preloadAll()` are the awaiting variants that the Phase 4
 * loading screen (`arLoading`) needs.
 *
 * Art paths are the Java ones ("Faces/Hero.jpg"), but the bytes served are the
 * 16x renderings that sit beside them; the original `.jpg` stays on disk as the
 * fallback when a variant is missing.
 */

/** Relative art directory; Java's `DCourtApplet.artpath` was "Images". */
let artPath = "Images";

const JPEG_SUFFIX = /\.jpe?g$/i;

/** Path prefix used for every image request. */
export function getArtpath(): string {
  return artPath;
}

/** Override the art root (main.ts may point this at a CDN/base href). */
export function setArtpath(path: string): void {
  artPath = path.replace(/\/+$/, "");
}

/** 16x art variant for a path: "Faces/Hero.jpg" -> "Faces/Hero_16x.png". */
export function artVariant(path: string): string {
  return JPEG_SUFFIX.test(path) ? path.replace(JPEG_SUFFIX, "_16x.png") : path;
}

/** Full URL for an art path such as `"Faces/Hero.jpg"`. */
export function resourceUrl(path: string): string {
  return `${artPath}/${artVariant(path)}`;
}

/**
 * Point an `<img>` at the 16x variant, falling back to the original art file
 * once if that variant cannot be loaded.  The listener is registered with
 * `{ once: true }` and never re-armed, so a missing original ends the chain
 * instead of looping.
 */
export function setArtSrc(img: HTMLImageElement, path: string): void {
  const variant = resourceUrl(path);
  img.src = variant;
  const original = `${artPath}/${path}`;
  if (variant === original) return;
  img.addEventListener("error", () => {
    img.src = original;
  }, { once: true });
}

const resourceTable = new Map<string, unknown>();

/** `Tools.storeResource(path, item)`. */
export function storeResource(path: string, item: unknown): void {
  resourceTable.set(path, item);
}

/** `Tools.findResource(path)` - returns the cached object or null. */
export function findResource<T = unknown>(path: string): T | null {
  const hit = resourceTable.get(path);
  return hit === undefined ? null : (hit as T);
}

/** `Tools.replaceResource(path, item)`. */
export function replaceResource(path: string, item: unknown): void {
  resourceTable.delete(path);
  resourceTable.set(path, item);
}

/** `Tools.dropDocumentResources()` - drops cached `*.doc` entries. */
export function dropDocumentResources(): void {
  for (const path of [...resourceTable.keys()]) {
    if (path.endsWith(".doc")) resourceTable.delete(path);
  }
}

/** Forget every cached resource (useful for tests and hot reloads). */
export function clearResources(): void {
  resourceTable.clear();
}

/**
 * Load (and cache) an image element, mirroring `Tools.loadImage`.
 * Returns null only for a null/empty path - like Java, the element is handed
 * back before the bytes have arrived.
 */
export function loadImage(path: string | null | undefined): HTMLImageElement | null {
  if (!path) return null;
  const cached = findResource<HTMLImageElement>(path);
  if (cached) return cached;
  const img = document.createElement("img");
  img.decoding = "async";
  img.alt = "";
  setArtSrc(img, path);
  storeResource(path, img);
  return img;
}

/**
 * A fresh `<img>` for the same path.  Used by painting helpers that place the
 * same art twice on one screen (a cached element can only live in one parent).
 */
export function imageElement(path: string, x: number, y: number, w: number, h: number): HTMLImageElement {
  const img = document.createElement("img");
  setArtSrc(img, path);
  img.alt = "";
  img.decoding = "async";
  img.style.position = "absolute";
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.objectFit = "fill";
  return img;
}

/**
 * Resolve once the image has decoded (or failed).  `arLoading` awaits these so
 * the splash stage machine becomes a plain async sequence.
 */
export function preload(path: string): Promise<HTMLImageElement | null> {
  const img = loadImage(path);
  if (!img) return Promise.resolve(null);
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
  return new Promise((resolve) => {
    const done = (): void => resolve(img);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}

/** Await a batch of art paths (sequential, so the ordering stays predictable). */
export async function preloadAll(paths: readonly string[]): Promise<void> {
  for (const path of paths) await preload(path);
}
