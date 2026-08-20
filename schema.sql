-- Cloudflare D1 schema for canvas sync.
-- Run once against the D1 database bound to the Pages project as `DB`.
--
-- Codes are never stored in the clear: both tables key on the SHA-256 of the
-- sync code, so a database dump cannot be replayed against the API.

-- Codes issued by the admin. The API rejects any code whose hash is absent
-- here, which is what stops anyone who finds the app URL from minting rows.
-- Populate with: node scripts/mint-sync-code.mjs "Anna's phone"
CREATE TABLE IF NOT EXISTS allowed_codes (
  id         TEXT PRIMARY KEY,
  label      TEXT,
  created_at TEXT NOT NULL
);

-- One canvas per issued code, created on that code's first upload.
CREATE TABLE IF NOT EXISTS canvases (
  id         TEXT PRIMARY KEY,
  doc        TEXT    NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL
);
