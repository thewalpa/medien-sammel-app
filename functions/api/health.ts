/**
 * Setup diagnostic for the sync backend.
 *
 *   curl https://<your-app>.pages.dev/api/health
 *
 * Answers the two questions that account for nearly every sync failure: is the
 * D1 binding attached to this deployment, and do the tables exist in the
 * database it points at? Returns booleans and counts only — no codes, no
 * canvas content, nothing that isn't already implied by the app existing.
 */

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface Env {
  DB?: D1Database;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function tableCount(db: D1Database, table: string): Promise<number | string> {
  try {
    const row = await db.prepare('SELECT COUNT(*) AS n FROM ' + table).first<{ n: number }>();
    return row?.n ?? 0;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export const onRequestGet = async ({ env }: { env: Env }): Promise<Response> => {
  if (!env || !env.DB) {
    return json(
      {
        ok: false,
        binding: false,
        hint:
          'D1 binding "DB" is not attached to this deployment. Add it under ' +
          'Settings -> Bindings for both Production and Preview, then redeploy — ' +
          'bindings only apply to deployments made after they are added.',
      },
      500
    );
  }

  const allowedCodes = await tableCount(env.DB, 'allowed_codes');
  const canvases = await tableCount(env.DB, 'canvases');
  const tablesOk = typeof allowedCodes === 'number' && typeof canvases === 'number';

  return json(
    {
      ok: tablesOk && allowedCodes > 0,
      binding: true,
      allowedCodes,
      canvases,
      hint: !tablesOk
        ? 'Binding works but a table is missing — run schema.sql against THIS database.'
        : allowedCodes === 0
          ? 'Tables exist but no codes are issued. Run scripts/mint-sync-code.mjs and ' +
            'insert the row, making sure it goes into the database bound as DB.'
          : 'Sync backend looks correctly configured.',
    },
    tablesOk ? 200 : 500
  );
};
