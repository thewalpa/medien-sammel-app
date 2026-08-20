import type { Node, Edge } from '../types';

/**
 * Client half of device sync against the Cloudflare Pages Function at /api/canvas.
 *
 * The synced document deliberately excludes `viewport`: pan position is
 * device-specific (a phone and a laptop want different framing), and including
 * it would mark the canvas dirty on every pan and push constantly.
 */
export interface SyncDoc {
  nodes: Node[];
  edges: Edge[];
}

export interface RemoteState {
  doc: SyncDoc;
  version: number;
  updatedAt: string;
}

export interface RemoteMeta {
  version: number;
  updatedAt: string;
}

/**
 * Codes are issued by the admin with scripts/mint-sync-code.mjs and cannot be
 * created from the client — the API rejects any code it did not issue.
 */
export type PushResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; conflict: RemoteState };

const ENDPOINT = '/api/canvas';
const CODE_KEY = 'medien-sammel:sync-code';
const META_KEY = 'medien-sammel:sync-meta';

/** Raised when the server rejects the sync code, so the UI can prompt for a new one. */
export class SyncAuthError extends Error {
  constructor() {
    super('Sync code was rejected');
    this.name = 'SyncAuthError';
  }
}

/**
 * Mirrors the server's normalization: strip grouping characters, uppercase, and
 * fold the glyphs Crockford treats as interchangeable so a mistyped O or l works.
 * Must stay identical to normalizeCode() in functions/api/canvas.ts.
 */
export function normalizeSyncCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

/** Groups into blocks of four for display; purely cosmetic. */
export function formatSyncCode(code: string): string {
  return (code.match(/.{1,4}/g) || []).join('-');
}

export function getSyncCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export function setSyncCode(code: string): void {
  try {
    localStorage.setItem(CODE_KEY, normalizeSyncCode(code));
  } catch {
    /* storage disabled — sync simply stays off */
  }
}

export function clearSyncCode(): void {
  try {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

export interface SyncMeta {
  /**
   * The version this device last agreed with the server on. Pushes are
   * conditional on it, which is what turns a silent overwrite into a
   * detectable conflict.
   */
  version: number;
  /**
   * Whether this device holds edits the server hasn't accepted yet. Persisted
   * rather than kept in memory so edits made offline are still known to be
   * unpushed after the app is closed and reopened.
   */
  dirty: boolean;
}

const EMPTY_META: SyncMeta = { version: 0, dirty: false };

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...EMPTY_META };
    const parsed = JSON.parse(raw);
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 0,
      dirty: parsed.dirty === true,
    };
  } catch {
    return { ...EMPTY_META };
  }
}

export function setSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ ...meta, at: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}

function authHeaders(code: string): HeadersInit {
  return { authorization: 'Bearer ' + code };
}

/** Cheap version probe — no document body. */
export async function fetchRemoteMeta(code: string): Promise<RemoteMeta | null> {
  const res = await fetch(ENDPOINT + '?meta=1', { headers: authHeaders(code), cache: 'no-store' });
  if (res.status === 404) return null;
  if (res.status === 401) throw new SyncAuthError();
  if (!res.ok) throw new Error('Sync check failed (' + res.status + ')');
  return res.json();
}

export async function fetchRemote(code: string): Promise<RemoteState | null> {
  const res = await fetch(ENDPOINT, { headers: authHeaders(code), cache: 'no-store' });
  if (res.status === 404) return null;
  if (res.status === 401) throw new SyncAuthError();
  if (!res.ok) throw new Error('Sync download failed (' + res.status + ')');
  return res.json();
}

export async function pushRemote(
  code: string,
  doc: SyncDoc,
  baseVersion: number
): Promise<PushResult> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { ...authHeaders(code), 'content-type': 'application/json' },
    body: JSON.stringify({ doc, baseVersion }),
  });

  if (res.status === 401) throw new SyncAuthError();

  if (res.status === 409) {
    const body = await res.json();
    return {
      ok: false,
      conflict: { doc: body.doc, version: body.version, updatedAt: body.updatedAt },
    };
  }

  if (!res.ok) throw new Error('Sync upload failed (' + res.status + ')');

  const body = await res.json();
  return { ok: true, version: body.version, updatedAt: body.updatedAt };
}
