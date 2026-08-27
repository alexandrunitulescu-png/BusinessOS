/**
 * Fails the build if a server-only secret leaked into the client bundle
 * (M0 §15 — "Scurgere secrete ... expunere în bundle client").
 *
 * Run after `next build`:  node scripts/check-bundle-secrets.mjs
 * Scans `.next/static` (shipped to browsers) for the actual secret *values* of
 * every non-`NEXT_PUBLIC_` key in `.env.local`. Exits non-zero on any hit.
 */
import { readFileSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = join(ROOT, ".next");

if (!existsSync(NEXT_DIR)) {
  console.error("No .next/ directory — run `next build` first.");
  process.exit(1);
}

// --- Collect needles -------------------------------------------------------
const needles = new Map(); // label -> string

const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!val) continue;
    // Anything NOT meant for the browser: no NEXT_PUBLIC_ prefix.
    if (!key.startsWith("NEXT_PUBLIC_") && val.length >= 8) {
      needles.set(`env:${key}`, val);
    }
  }
}

if (needles.size === 0) {
  console.error("No non-public secrets found in .env.local — nothing to check.");
  process.exit(1);
}

// NB: structural markers like the bare string "sb_secret_" or "service_role" are
// deliberately NOT checked — @supabase/ssr ships guard code containing those
// literals ( `key.startsWith("sb_secret_")` ), so they always match and mean
// nothing. Only the real secret *values* above are meaningful.

// --- Scan ----------------------------------------------------------------
const SCAN_DIRS = [join(NEXT_DIR, "static")];
const SCAN_EXT = new Set([".js", ".mjs", ".cjs", ".json", ".map", ".txt", ".html", ""]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (SCAN_EXT.has(extname(e.name))) yield p;
  }
}

const hits = [];
for (const dir of SCAN_DIRS) {
  for await (const file of walk(dir)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const [label, needle] of needles) {
      if (content.includes(needle)) {
        hits.push({ file: file.replace(ROOT, "."), label });
      }
    }
  }
}

if (hits.length) {
  console.error("\n❌ Secret material found in the client bundle:\n");
  for (const h of hits) console.error(`   ${h.label}  →  ${h.file}`);
  console.error("\nMove the value behind a server-only module and rebuild.\n");
  process.exit(1);
}

console.log(`✅ No server secrets in .next/static (checked ${needles.size} secret value(s)).`);
