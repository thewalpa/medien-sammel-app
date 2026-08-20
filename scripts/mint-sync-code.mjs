#!/usr/bin/env node
/**
 * Mints a sync code for one person and prints the SQL that authorizes it.
 *
 * Codes cannot be created through the API — the Worker only accepts a code whose
 * hash is already in `allowed_codes` — so this script is the only way to issue
 * one. Run it, paste the SQL into the D1 console, hand the code to the person.
 *
 *   node scripts/mint-sync-code.mjs "Anna's phone"
 *
 * IMPORTANT: the alphabet, the hash prefix and the normalization rules below
 * must match functions/api/canvas.ts exactly, which is the source of truth. If
 * they drift, minted codes will be rejected as unissued. These are duplicated
 * rather than imported because the Worker, the app and this script are three
 * separate build contexts with no shared module.
 */
import { randomBytes, createHash } from 'node:crypto';

/** Crockford base32 — omits I, L, O and U so codes survive being read aloud. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const HASH_PREFIX = 'medien-sammel:v1:';

/** 16 random bytes (128 bits) rendered as 26 base32 characters. */
function generateCode() {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function normalizeCode(raw) {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

function codeToId(code) {
  return createHash('sha256').update(HASH_PREFIX + code).digest('hex');
}

function formatCode(code) {
  return (code.match(/.{1,4}/g) || []).join('-');
}

/** Escapes a value for a single-quoted SQL string literal. */
function sqlQuote(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

const label = process.argv[2] || 'unlabelled';
const code = generateCode();
const id = codeToId(normalizeCode(code));
const createdAt = new Date().toISOString();

console.log('');
console.log('  Label:  ' + label);
console.log('  Code:   ' + formatCode(code));
console.log('');
console.log('  Give the code to that person. Run this in the D1 console:');
console.log('');
console.log(
  '    INSERT INTO allowed_codes (id, label, created_at) VALUES (' +
    sqlQuote(id) +
    ', ' +
    sqlQuote(label) +
    ', ' +
    sqlQuote(createdAt) +
    ');'
);
console.log('');
console.log('  The code itself is never stored, so it cannot be recovered');
console.log('  from the database — reissue a new one if it is lost.');
console.log('');
