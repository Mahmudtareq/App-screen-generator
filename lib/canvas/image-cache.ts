/**
 * The single image-loading path for anything drawn on the canvas.
 *
 * Every remote image is fetched as a Blob and rendered from a same-origin
 * `blob:` object URL rather than from its original URL. That is what keeps the
 * canvas origin-clean, and it is deliberate rather than incidental:
 *
 * Setting `crossOrigin = "anonymous"` on an <img> is the usual advice, and it
 * works right up until the browser has already cached a copy of the same URL
 * fetched *without* CORS — by a picker thumbnail, a `next/image`, or a CSS
 * background. The cached response has no `Access-Control-Allow-Origin` header,
 * the browser reuses it for the CORS request anyway, and the canvas silently
 * taints. `stage.toBlob()` then throws `SecurityError` for some users, or only on
 * the second export, and never reproduces on a hard refresh.
 *
 * Fetching to a Blob sidesteps all of it: a `blob:` URL is same-origin by
 * construction, so no cache state and no other component's fetch can taint us.
 *
 * Bitmaps live here, in a module-level map, and never in the Zustand store —
 * they are not serialisable and would be deep-cloned into undo history.
 */

export type ImageEntry =
  | { status: "loading" }
  | { status: "loaded"; image: HTMLImageElement }
  | { status: "error"; error: Error };

interface InternalEntry {
  entry: ImageEntry;
  /** Object URL we created and must revoke; absent when the caller owns the URL. */
  ownedObjectUrl?: string;
  promise: Promise<HTMLImageElement>;
  lastUsed: number;
}

const MAX_ENTRIES = 24;

const cache = new Map<string, InternalEntry>();
const listeners = new Set<() => void>();

let clock = 0;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntry(url: string | null | undefined): ImageEntry | undefined {
  if (!url) return undefined;
  const record = cache.get(url);
  if (record) record.lastUsed = ++clock;
  return record?.entry;
}

/** Server render has no images; useSyncExternalStore needs a stable value here. */
export function getServerEntry(): undefined {
  return undefined;
}

function evictIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;

  const entries = [...cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  const excess = cache.size - MAX_ENTRIES;

  for (let i = 0; i < excess; i++) {
    const [url, record] = entries[i];
    if (record.ownedObjectUrl) URL.revokeObjectURL(record.ownedObjectUrl);
    cache.delete(url);
  }
}

async function loadImage(url: string): Promise<{
  image: HTMLImageElement;
  ownedObjectUrl?: string;
}> {
  // A blob: or data: URL is already same-origin — fetching it again would only
  // duplicate bytes the browser is holding for us.
  const isLocal = url.startsWith("blob:") || url.startsWith("data:");

  let src = url;
  let ownedObjectUrl: string | undefined;

  if (!isLocal) {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) {
      throw new Error(`Could not load image (${response.status})`);
    }
    ownedObjectUrl = URL.createObjectURL(await response.blob());
    src = ownedObjectUrl;
  }

  const image = new Image();
  image.src = src;

  try {
    await image.decode();
  } catch (cause) {
    if (ownedObjectUrl) URL.revokeObjectURL(ownedObjectUrl);
    throw new Error("Image could not be decoded", { cause });
  }

  return { image, ownedObjectUrl };
}

/** Starts (or joins) a load for `url`. Safe to call on every render. */
export function ensureLoaded(url: string): Promise<HTMLImageElement> {
  const existing = cache.get(url);
  if (existing) {
    existing.lastUsed = ++clock;
    return existing.promise;
  }

  const promise = loadImage(url)
    .then(({ image, ownedObjectUrl }) => {
      const record = cache.get(url);
      if (record) {
        record.entry = { status: "loaded", image };
        record.ownedObjectUrl = ownedObjectUrl;
      }
      emit();
      return image;
    })
    .catch((error: unknown) => {
      const record = cache.get(url);
      if (record) {
        record.entry = {
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
      emit();
      throw error;
    });

  cache.set(url, { entry: { status: "loading" }, promise, lastUsed: ++clock });
  evictIfNeeded();
  emit();

  return promise;
}

/**
 * Resolves once every URL has either loaded or failed.
 *
 * Awaited before export so a mockup can never be rendered with a half-loaded
 * screenshot — a failure still resolves, because a missing logo should not block
 * the user from exporting the rest of their design.
 */
export async function whenAllSettled(urls: readonly (string | null | undefined)[]) {
  const pending = urls
    .filter((url): url is string => Boolean(url))
    .map((url) => ensureLoaded(url).catch(() => undefined));

  await Promise.all(pending);
}

/** Drops a URL from the cache, revoking the object URL if we created it. */
export function invalidate(url: string) {
  const record = cache.get(url);
  if (!record) return;
  if (record.ownedObjectUrl) URL.revokeObjectURL(record.ownedObjectUrl);
  cache.delete(url);
  emit();
}
