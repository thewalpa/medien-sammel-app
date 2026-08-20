/**
 * Cloudflare Pages Function backing device sync.
 *
 * Auth is a single unguessable sync code sent as `Authorization: Bearer <code>`.
 * There are no accounts: possession of the code grants access to exactly one
 * canvas. We store only the SHA-256 of the code, so the stored row cannot be
 * replayed against this API.
 *
 * Codes cannot be self-issued. A code is only accepted if its hash is already
 * in `allowed_codes`, which the admin populates out of band via
 * `scripts/mint-sync-code.mjs`. Without that check, anyone who found this URL
 * could mint unlimited rows and exhaust the database.
 *
 * Writes are conditional on the version the client last saw, so a device with a
 * stale copy gets a 409 (with the current server state) instead of silently
 * clobbering the other device's work.
 *
 *   GET  /api/canvas          -> 200 { doc, version, updatedAt } | 404
 *   GET  /api/canvas?meta=1   -> 200 { version, updatedAt } | 404   (cheap poll)
 *   PUT  /api/canvas          -> 200 { version, updatedAt }
 *                                409 { error, doc, version, updatedAt }
 *
 * Deliberately kept dependency-free: `functions/` is outside the app's
 * tsconfig `include`, and Pages compiles it without type-checking, so the
 * handful of D1 types we need are declared inline rather than pulling in
 * @cloudflare/workers-types.
 */

interface D1Meta {
  changes: number;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: D1Meta }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB: D1Database;
}

interface RequestContext {
  request: Request;
  env: Env;
}

interface CanvasRow {
  doc: string;
  version: number;
  updated_at: string;
}

/** Sync codes are Crockford base32; 26 chars carries ~130 bits of entropy. */
const CODE_PATTERN = /^[0-9A-Z]{16,64}$/;

/** Generous ceiling — a large canvas is tens of KB, so this is pure abuse protection. */
const MAX_DOC_BYTES = 1_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Sync responses are per-code and must never be stored by a shared cache.
      'cache-control': 'no-store',
    },
  });
}

/**
 * Normalizes user-typed codes: strips grouping dashes/spaces, uppercases, and
 * folds the Crockford-ambiguous glyphs so a transcribed "O" or "l" still works.
 */
function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

async function codeToId(code: string): Promise<string> {
  const data = new TextEncoder().encode('medien-sammel:v1:' + code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns the row id for the request's sync code, or null if it is missing,
 * malformed, or was never issued by the admin.
 */
async function authenticate(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const code = normalizeCode(match[1]);
  if (!CODE_PATTERN.test(code)) return null;

  const id = await codeToId(code);
  const issued = await env.DB.prepare('SELECT 1 AS ok FROM allowed_codes WHERE id = ?')
    .bind(id)
    .first<{ ok: number }>();
  return issued ? id : null;
}

function readRow(env: Env, id: string): Promise<CanvasRow | null> {
  return env.DB.prepare('SELECT doc, version, updated_at FROM canvases WHERE id = ?')
    .bind(id)
    .first<CanvasRow>();
}

const handleGet = async ({ request, env }: RequestContext): Promise<Response> => {
  const id = await authenticate(request, env);
  if (!id) return json({ error: 'unauthorized' }, 401);

  const row = await readRow(env, id);
  if (!row) return json({ error: 'not_found' }, 404);

  // `?meta=1` skips the document body so a foreground check costs almost nothing
  // on a phone connection; the client only fetches the doc when versions differ.
  const metaOnly = new URL(request.url).searchParams.get('meta') === '1';
  if (metaOnly) return json({ version: row.version, updatedAt: row.updated_at });

  return json({ doc: JSON.parse(row.doc), version: row.version, updatedAt: row.updated_at });
};

const handlePut = async ({ request, env }: RequestContext): Promise<Response> => {
  const id = await authenticate(request, env);
  if (!id) return json({ error: 'unauthorized' }, 401);

  let payload: { doc?: unknown; baseVersion?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { doc, baseVersion } = payload;
  if (!doc || typeof doc !== 'object') return json({ error: 'invalid_doc' }, 400);
  if (typeof baseVersion !== 'number' || baseVersion < 0 || !Number.isInteger(baseVersion)) {
    return json({ error: 'invalid_base_version' }, 400);
  }

  const serialized = JSON.stringify(doc);
  if (serialized.length > MAX_DOC_BYTES) return json({ error: 'doc_too_large' }, 413);

  const now = new Date().toISOString();

  // baseVersion 0 means "I believe nothing is stored yet" — create, but lose the
  // race gracefully if another device got there first.
  if (baseVersion === 0) {
    const insert = await env.DB.prepare(
      'INSERT INTO canvases (id, doc, version, updated_at) VALUES (?, ?, 1, ?) ' +
        'ON CONFLICT(id) DO NOTHING'
    )
      .bind(id, serialized, now)
      .run();

    if (insert.meta.changes > 0) return json({ version: 1, updatedAt: now });

    const current = await readRow(env, id);
    return json(
      {
        error: 'conflict',
        doc: current ? JSON.parse(current.doc) : null,
        version: current?.version ?? 0,
        updatedAt: current?.updated_at ?? null,
      },
      409
    );
  }

  const update = await env.DB.prepare(
    'UPDATE canvases SET doc = ?, version = version + 1, updated_at = ? ' +
      'WHERE id = ? AND version = ?'
  )
    .bind(serialized, now, id, baseVersion)
    .run();

  if (update.meta.changes > 0) return json({ version: baseVersion + 1, updatedAt: now });

  // Either the row is gone or another device advanced the version. Hand back the
  // current server state so the client can reconcile without a second round trip.
  const current = await readRow(env, id);
  if (!current) return json({ error: 'not_found' }, 404);
  return json(
    {
      error: 'conflict',
      doc: JSON.parse(current.doc),
      version: current.version,
      updatedAt: current.updated_at,
    },
    409
  );
};

/**
 * Without this, any throw surfaces as a bare Cloudflare 1101 "Worker threw
 * exception" page with no detail, which is close to undebuggable from the
 * client. A missing D1 binding is called out specifically because it is by far
 * the most common cause: bindings only take effect on a deployment made *after*
 * they were added, and they must exist for both Production and Preview.
 *
 * The underlying message is echoed to the caller. That is a deliberate trade
 * for a small private deployment — tighten it to a generic string if this ever
 * faces a wider audience.
 */
function guarded(
  handler: (ctx: RequestContext) => Promise<Response>
): (ctx: RequestContext) => Promise<Response> {
  return async (ctx) => {
    if (!ctx.env || !ctx.env.DB) {
      console.error('sync: D1 binding "DB" is missing');
      return json(
        {
          error: 'misconfigured',
          detail:
            'D1 binding "DB" is not attached to this deployment. Add it under ' +
            'Settings -> Bindings for both Production and Preview, then redeploy.',
        },
        500
      );
    }
    try {
      return await handler(ctx);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      // Surfaces in the dashboard's real-time logs and in `wrangler pages deployment tail`.
      console.error('sync error:', detail);
      return json({ error: 'server_error', detail }, 500);
    }
  };
}

export const onRequestGet = guarded(handleGet);
export const onRequestPut = guarded(handlePut);
