/**
 * Cross-tenant isolation suite (M0 §6/§15 — "teste automate obligatorii, nu
 * opționale"). Proves that a user in organization B cannot SELECT, INSERT,
 * UPDATE, DELETE, or reach the Storage objects of organization A — and that the
 * audit trail is append-only.
 *
 * Runs against the remote Supabase project (no local Docker here). Reads
 * `.env.local` for NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * and SUPABASE_SECRET_KEY.
 *
 *   node scripts/test-rls-isolation.mjs      (or: npm run test:rls)
 *
 * Creates two throwaway users + orgs, asserts, and always cleans them up.
 * Exit code 0 = every cross-tenant operation was denied.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------- env + clients
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;
if (!URL_ || !PUB || !SECRET) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const anonClient = () => createClient(URL_, PUB, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------- test harness
let passed = 0;
let failed = 0;
const ok = (cond, msg) => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL  ${msg}`);
  }
};
/** An operation is "denied" if it errored OR silently affected/returned no rows. */
const deniedWrite = ({ data, error }) => !!error || !data || data.length === 0;

const rnd = Math.random().toString(36).slice(2, 8);
const mkEmail = (tag) => `rls-test-${tag}-${rnd}@businessos-test.invalid`;
const PASSWORD = `Test-${rnd}-2026!`;

const state = { users: [], orgs: [], objects: [] };

async function makeTenant(tag) {
  const email = mkEmail(tag);
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (cErr) throw new Error(`createUser(${tag}): ${cErr.message}`);
  state.users.push(created.user.id);

  const db = anonClient();
  const { error: sErr } = await db.auth.signInWithPassword({ email, password: PASSWORD });
  if (sErr) throw new Error(`signIn(${tag}): ${sErr.message}`);

  const cui = `${Math.floor(1_000_000 + Math.random() * 8_000_000)}`;
  const { data: orgId, error: oErr } = await db.rpc("create_organization", {
    p_entity_type: "SRL",
    p_legal_name: `RLS Test ${tag} ${rnd}`,
    p_trade_name: "",
    p_cui: cui,
    p_registration_number: "",
    p_address_line: "Str. Test 1",
    p_city: "Timișoara",
    p_county: "Timiș",
    p_postal_code: "",
    p_vat_registered: false,
    p_vat_code: "",
    p_default_currency: "RON",
    p_invoice_series: `RLS${tag}`,
    p_invoice_next_number: 1,
    p_iban: "",
    p_bank_name: "",
  });
  if (oErr) throw new Error(`create_organization(${tag}): ${oErr.message}`);
  state.orgs.push(orgId);

  // Seed one client row (service-role, bypasses RLS).
  const { data: seededClient, error: seedErr } = await admin
    .from("clients")
    .insert({ organization_id: orgId, type: "COMPANY", company_name: `Seed ${tag}`, country: "RO" })
    .select("id")
    .single();
  if (seedErr) throw new Error(`seed client(${tag}): ${seedErr.message}`);

  // Seed one private Storage object under the org folder.
  const objectPath = `${orgId}/test/${rnd}-${tag}.txt`;
  const { error: upErr } = await admin.storage
    .from("org-files")
    .upload(objectPath, new Blob([`secret of ${tag}`]), { contentType: "text/plain", upsert: true });
  if (upErr) throw new Error(`seed object(${tag}): ${upErr.message}`);
  state.objects.push(objectPath);

  return { tag, email, userId: created.user.id, orgId, db, clientId: seededClient.id, objectPath };
}

// ---------------------------------------------------------------- assertions
async function run() {
  console.log("Setting up two tenants…");
  const A = await makeTenant("A");
  const B = await makeTenant("B");
  console.log(`  org A = ${A.orgId}\n  org B = ${B.orgId}\n`);

  // ---- 1. SELECT is filtered ------------------------------------------------
  console.log("1) cross-tenant SELECT");
  for (const table of ["clients", "invoices", "expenses", "documents", "subscriptions", "usage_tracking"]) {
    const { data, error } = await B.db.from(table).select("*").eq("organization_id", A.orgId);
    ok(!error && Array.isArray(data) && data.length === 0, `B sees 0 rows of A.${table} (${data?.length ?? "err"})`);
  }
  {
    const { data } = await B.db.from("clients").select("id");
    ok(!(data ?? []).some((r) => r.id === A.clientId), "B's unfiltered clients list excludes A's seeded client");
  }

  // ---- 2. INSERT into another org is rejected -----------------------------
  console.log("2) cross-tenant INSERT");
  {
    const res = await B.db
      .from("clients")
      .insert({ organization_id: A.orgId, type: "COMPANY", company_name: "INJECTED", country: "RO" })
      .select("id");
    ok(!!res.error, `B INSERT client into A rejected (${res.error?.code ?? "no error!"})`);
    const inv = await B.db
      .from("invoices")
      .insert({ organization_id: A.orgId, status: "DRAFT", issue_date: "2026-08-01", currency: "RON" })
      .select("id");
    ok(!!inv.error, `B INSERT invoice into A rejected (${inv.error?.code ?? "no error!"})`);
  }

  // ---- 3. UPDATE of another org's row is a no-op --------------------------
  console.log("3) cross-tenant UPDATE");
  {
    const res = await B.db
      .from("clients")
      .update({ company_name: "HACKED" })
      .eq("id", A.clientId)
      .select("id");
    ok(deniedWrite(res), `B UPDATE of A's client affected no rows (${res.data?.length ?? "err"})`);
    const { data: check } = await admin.from("clients").select("company_name").eq("id", A.clientId).single();
    ok(check.company_name === "Seed A", `A's client name unchanged in DB (is "${check.company_name}")`);
  }

  // ---- 4. DELETE of another org's row is a no-op -------------------------
  console.log("4) cross-tenant DELETE");
  {
    const res = await B.db.from("clients").delete().eq("id", A.clientId).select("id");
    ok(deniedWrite(res), `B DELETE of A's client affected no rows (${res.data?.length ?? "err"})`);
    const { data: still } = await admin.from("clients").select("id").eq("id", A.clientId).maybeSingle();
    ok(!!still, "A's client still present in DB");
  }

  // ---- 5. Storage isolation --------------------------------------------
  console.log("5) cross-tenant Storage");
  {
    const dl = await B.db.storage.from("org-files").download(A.objectPath);
    ok(!!dl.error || !dl.data, `B download of A's object denied (${dl.error?.message ?? "got data!"})`);
    const ls = await B.db.storage.from("org-files").list(A.orgId);
    ok(!ls.error && (ls.data ?? []).length === 0, `B list of A's folder returns nothing (${ls.data?.length ?? "err"})`);
    const up = await B.db.storage
      .from("org-files")
      .upload(`${A.orgId}/test/${rnd}-injected.txt`, new Blob(["x"]), { upsert: true });
    ok(!!up.error, `B upload into A's folder denied (${up.error?.message ?? "uploaded!"})`);
    const rm = await B.db.storage.from("org-files").remove([A.objectPath]);
    const removedNothing = !!rm.error || (rm.data ?? []).length === 0;
    ok(removedNothing, `B delete of A's object removed nothing (${rm.data?.length ?? "err"})`);
    const { data: exists } = await admin.storage.from("org-files").list(`${A.orgId}/test`);
    ok((exists ?? []).some((f) => A.objectPath.endsWith(f.name)), "A's object still in Storage");
  }

  // ---- 6. audit_logs is append-only ----------------------------------
  console.log("6) audit_logs immutability");
  {
    const ins = await B.db
      .from("audit_logs")
      .insert({ organization_id: B.orgId, action: "test.marker", metadata: {} })
      .select("id")
      .single();
    ok(!ins.error, `B can append its own audit row (${ins.error?.message ?? "ok"})`);
    if (!ins.error) {
      const upd = await B.db.from("audit_logs").update({ action: "tampered" }).eq("id", ins.data.id).select("id");
      ok(!!upd.error || (upd.data ?? []).length === 0, `B UPDATE of audit row denied (${upd.error?.code ?? "no rows"})`);
      const del = await B.db.from("audit_logs").delete().eq("id", ins.data.id).select("id");
      ok(!!del.error || (del.data ?? []).length === 0, `B DELETE of audit row denied (${del.error?.code ?? "no rows"})`);
    }
  }

  // ---- 7. mirrored: A cannot reach B ---------------------------------
  console.log("7) mirrored A → B");
  {
    const { data: sel } = await A.db.from("clients").select("id").eq("organization_id", B.orgId);
    ok((sel ?? []).length === 0, "A sees 0 rows of B.clients");
    const insA = await A.db
      .from("expenses")
      .insert({ organization_id: B.orgId, expense_date: "2026-08-01", amount: 1, vat_amount: 0, currency: "RON" })
      .select("id");
    ok(!!insA.error, `A INSERT expense into B rejected (${insA.error?.code ?? "no error!"})`);
  }

  // ---- 8. platform admin: the ONE sanctioned cross-tenant path (M11) ----
  // A platform admin may list orgs and manage plans, but still cannot read
  // another tenant's business data.
  console.log("8) platform admin scope");
  {
    const { error: flagErr } = await admin
      .from("profiles")
      .update({ is_platform_admin: true })
      .eq("id", A.userId);
    ok(!flagErr, `granted A platform-admin (${flagErr?.message ?? "ok"})`);
    // No teardown needed: deleting user A cascades its profile row.

    // The flag is read server-side by is_platform_admin() (not from the JWT), so
    // A's existing session picks it up immediately.
    const subSel = await A.db.from("subscriptions").select("organization_id, plan_id").eq("organization_id", B.orgId);
    ok(!subSel.error && (subSel.data ?? []).length === 1, `admin A CAN read B's subscription (${subSel.data?.length ?? subSel.error?.code})`);

    const { data: freePlan } = await admin.from("plans").select("id").eq("code", "FREE").single();
    const subUpd = await A.db
      .from("subscriptions")
      .update({ plan_id: freePlan.id, status: "ACTIVE", trial_ends_at: null })
      .eq("organization_id", B.orgId)
      .select("id");
    ok(!subUpd.error && (subUpd.data ?? []).length === 1, `admin A CAN update B's plan (${subUpd.error?.code ?? "ok"})`);

    const cliSel = await A.db.from("clients").select("id").eq("organization_id", B.orgId);
    ok(!cliSel.error && (cliSel.data ?? []).length === 0, `admin A still sees 0 rows of B.clients (data stays isolated)`);
    const invSel = await A.db.from("invoices").select("id").eq("organization_id", B.orgId);
    ok(!invSel.error && (invSel.data ?? []).length === 0, `admin A still sees 0 rows of B.invoices`);
    const docDl = await A.db.storage.from("org-files").download(B.objectPath);
    ok(!!docDl.error || !docDl.data, `admin A still cannot download B's storage object`);
  }
}

// ---------------------------------------------------------------- teardown
const swallow = async (p) => {
  try {
    await p;
  } catch {
    /* best-effort cleanup */
  }
};

async function cleanup() {
  console.log("\nCleaning up…");
  for (const path of state.objects) {
    await swallow(admin.storage.from("org-files").remove([path]));
  }
  // also sweep any injected objects
  for (const orgId of state.orgs) {
    const { data } = await admin.storage.from("org-files").list(`${orgId}/test`);
    if (data?.length) {
      await swallow(
        admin.storage.from("org-files").remove(data.map((f) => `${orgId}/test/${f.name}`)),
      );
    }
  }
  for (const orgId of state.orgs) {
    await swallow(admin.from("organizations").delete().eq("id", orgId));
  }
  for (const userId of state.users) {
    await swallow(admin.auth.admin.deleteUser(userId));
  }
  console.log("  done.");
}

// ---------------------------------------------------------------- main
let runError;
try {
  await run();
} catch (err) {
  runError = err;
  console.error("\nSuite aborted:", err.message);
} finally {
  await cleanup();
}

console.log(`\n================  ${passed} passed, ${failed} failed  ================`);
process.exit(runError || failed ? 1 : 0);
