/**
 * Local blob store for user-uploaded photos.
 *
 * Uploads used to live in `node.imageUrl` as base64 data URLs, which put them
 * inside the synced document: a handful of photos blew past the API's 1 MB doc
 * ceiling, and every unrelated edit re-uploaded all of them. Nodes now carry a
 * `local:<hash>` reference and the bytes stay in IndexedDB on this device.
 *
 * Keys are the SHA-256 of the image bytes, so the same photo added twice is
 * stored once, and a reference stays valid for the life of the blob.
 */

import { openDB } from './storage';

const STORE = 'images';

export const LOCAL_IMAGE_PREFIX = 'local:';

export function isLocalImageRef(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith(LOCAL_IMAGE_PREFIX);
}

function refToKey(ref: string): string {
  return ref.slice(LOCAL_IMAGE_PREFIX.length);
}

/**
 * Object URLs are cached for the life of the page. References are content
 * hashes, so an entry can never go stale, and a canvas holds few enough photos
 * that holding the blobs open costs less than re-reading them on every render.
 * Only `pruneImages` revokes, because only it can make a key disappear.
 */
const urlCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Blobs stored during this session. A photo is written the moment it is picked
 * but only reaches the node when the edit is saved, so without this a prune in
 * that window would see an unreferenced blob and delete the photo the user is
 * still looking at. Anything genuinely abandoned is collected by the first
 * prune after the next reload.
 */
const storedThisSession = new Set<string>();

/**
 * `crypto.subtle` only exists in a secure context, so a dev server reached over
 * plain http from a phone would have none. Falling back to a random key loses
 * deduplication and nothing else.
 */
async function hashBytes(buffer: ArrayBuffer): Promise<string> {
  if (!crypto?.subtle) {
    return 'r' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function writeBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function allKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]) || []);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',', 2);
  const type = header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Stores the blob and returns the `local:` reference to put on the node. */
export async function putImage(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const key = await hashBytes(buffer);
  // Re-storing identical bytes is a no-op, but the write is cheap enough that
  // checking first would cost an extra transaction for no gain.
  await writeBlob(key, blob);
  storedThisSession.add(key);
  return LOCAL_IMAGE_PREFIX + key;
}

/**
 * Stores an inline `data:` image and returns its reference. Used by the
 * migration that lifts photos out of canvases saved before blobs moved to
 * IndexedDB; the decode is synchronous, so a malformed URL throws here rather
 * than producing an empty blob.
 */
export async function putImageFromDataUrl(dataUrl: string): Promise<string> {
  return putImage(dataUrlToBlob(dataUrl));
}

/**
 * Resolves a reference to an object URL usable as an `<img src>`. Returns null
 * for a reference this device has no bytes for — the expected outcome for a
 * photo uploaded on another device, since blobs are not synced.
 */
export function resolveLocalImage(ref: string): Promise<string | null> {
  const key = refToKey(ref);
  const cached = urlCache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const load = readBlob(key)
    .then((blob) => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(key, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, load);
  return load;
}

/**
 * Deletes blobs no node references any more — a photo replaced during an edit,
 * or one whose node was deleted. Callers must only pass a complete, hydrated
 * set of references; a partial set would delete photos that are still in use.
 */
export async function pruneImages(refsInUse: Iterable<string>): Promise<number> {
  const keep = new Set<string>();
  for (const ref of refsInUse) {
    if (isLocalImageRef(ref)) keep.add(refToKey(ref));
  }

  const keys = await allKeys();
  const orphans = keys.filter((key) => !keep.has(key) && !storedThisSession.has(key));
  if (orphans.length === 0) return 0;

  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const key of orphans) store.delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });

  for (const key of orphans) {
    const url = urlCache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(key);
    }
  }
  return orphans.length;
}

/**
 * Bundles the referenced blobs as data URLs so a JSON backup stays
 * self-contained. Without this an export would carry `local:` references whose
 * bytes exist nowhere in the file.
 */
export async function collectImagesForExport(
  refs: Iterable<string>
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const ref of refs) {
    if (!isLocalImageRef(ref) || out[refToKey(ref)]) continue;
    const key = refToKey(ref);
    try {
      const blob = await readBlob(key);
      if (blob) out[key] = await blobToDataUrl(blob);
    } catch {
      /* a photo we cannot read is skipped rather than failing the whole export */
    }
  }
  return out;
}

/** Restores blobs from an export bundle, keeping their original keys. */
export async function restoreImagesFromExport(images: Record<string, string>): Promise<void> {
  for (const [key, dataUrl] of Object.entries(images || {})) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;
    try {
      await writeBlob(key, dataUrlToBlob(dataUrl));
    } catch {
      /* skip an unreadable entry rather than aborting the import */
    }
  }
}
