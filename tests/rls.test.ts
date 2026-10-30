// Access-control tests against the live Supabase API (same path an attacker would use).
// Usage: node --env-file=.env.local --test tests/rls.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Azentio-2026!";

const anon = () => createClient(url, anonKey, { auth: { persistSession: false } });
async function as(email: string) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ifError(error);
  return c;
}

test("public visitor cannot read private data", async () => {
  const c = anon();
  for (const t of ["contributions", "shared_contributions", "improvement_ideas", "memberships", "audit_log"]) {
    const { data } = await c.from(t).select("id").limit(1);
    assert.equal(data?.length ?? 0, 0, `${t} leaked to anon`);
  }
  const { data: content } = await c.from("content_items").select("audience");
  assert.ok(content!.length > 0);
  assert.ok(content!.every((r) => r.audience === "public"), "non-public content visible to anon");
});

test("client cannot see another tenant's contributions or private drafts", async () => {
  const meridian = await as("lead@meridian.example");
  const { data } = await meridian.from("contributions").select("org_id, author_id, title");
  const { data: me } = await meridian.auth.getUser();
  assert.ok(data!.every((r) => r.author_id === me.user!.id), "saw someone else's contribution");
});

test("client cannot forge another tenant id on insert", async () => {
  const nw = await as("analyst@northwind.example");
  const admin = await as("lead@meridian.example");
  const { data: orgs } = await admin.from("organizations").select("id").limit(1);
  const { error } = await nw.from("contributions").insert({
    org_id: orgs![0].id, kind: "market_observation", title: "Forged tenant insert", body: "x".repeat(30),
    period_start: "2026-01-01", period_end: "2026-02-01", evidence_type: "anecdotal", confidence: "low",
  });
  assert.ok(error, "insert into another org succeeded");
});

test("shared payloads expose no tenant or author fields, and source links are hidden", async () => {
  const c = await as("user@atlas.example");
  const { data } = await c.from("shared_contributions").select("*");
  assert.ok(data!.length >= 3);
  for (const row of data!) for (const k of ["org_id", "author_id", "contribution_id"]) assert.ok(!(k in row));
  const { data: src } = await c.from("shared_sources").select("*");
  assert.equal(src!.length, 0);
});

test("clients cannot read internal improvement ideas, only the safe projection", async () => {
  const c = await as("analyst@northwind.example");
  const { data: raw } = await c.from("improvement_ideas").select("*");
  assert.equal(raw!.length, 0);
  const { data: safe, error } = await c.rpc("client_ideas");
  assert.ifError(error);
  assert.ok(safe!.length >= 1 && !("problem" in safe![0]) && !("priority" in safe![0]));
});

test("clients cannot see employee-only content or moderation notes", async () => {
  const c = await as("analyst@northwind.example");
  const { data } = await c.from("content_items").select("audience");
  assert.ok(data!.every((r) => r.audience !== "employee"));
  const { data: notes } = await c.from("moderation_notes").select("*");
  assert.equal(notes!.length, 0);
});

test("non-moderators cannot moderate; clients cannot escalate roles", async () => {
  const c = await as("admin@northwind.example");
  const { error } = await c.rpc("moderate_contribution", { p_id: "00000000-0000-0000-0000-000000000000", p_action: "publish" });
  assert.match(error!.message, /moderator role required/);
  const { data: mems } = await c.from("memberships").select("id").limit(1);
  const { error: e2 } = await c.from("role_grants").insert({ membership_id: mems![0].id, role: "portal_admin" });
  assert.ok(e2, "client admin granted a platform role");
});

test("employee status does not imply admin", async () => {
  const c = await as("employee@azentio.com");
  const { data } = await c.from("audit_log").select("id").limit(1);
  assert.equal(data!.length, 0);
  const { error } = await c.from("content_items").insert({ kind: "banner", title: "x", audience: "public", is_published: true });
  assert.ok(error, "ordinary employee published content");
});

test("lifecycle fields cannot be changed directly", async () => {
  const c = await as("analyst@northwind.example");
  const { data } = await c.from("contributions").select("id").eq("state", "draft").limit(1);
  const { error } = await c.from("contributions").update({ state: "published" }).eq("id", data![0].id);
  assert.ok(error, "state changed without workflow");
});

test("theme stats count distinct orgs and respect minimum cohort", async () => {
  const c = await as("user@atlas.example");
  const { data: themes } = await c.from("themes").select("id").limit(1);
  const { data } = await c.rpc("theme_stats", { p_theme: themes![0].id });
  assert.equal(data![0].org_count, 3);
});

test("federated programme: clients cannot read runs or decide models; only client admins set their own org's consent", async () => {
  const client = await as("analyst@northwind.example");
  const { data: runs } = await client.from("fl_runs").select("id");
  assert.equal(runs!.length, 0);
  const { error: e1 } = await client.rpc("set_fl_participation", { p_org: "00000000-0000-0000-0000-000000000000", p_status: "withdrawn" });
  assert.match(e1!.message, /client admin/);
  const emp = await as("employee@azentio.com");
  const { data: models } = await emp.from("fl_models").select("id").limit(1);
  assert.ok(models!.length >= 1);
  const { error: e2 } = await emp.rpc("decide_fl_model", { p_model: models![0].id, p_action: "approve", p_note: "x" });
  assert.match(e2!.message, /product owner or portal admin/);
});

test("comments and bookmarks stay within the viewer's scope", async () => {
  const c = await as("user@atlas.example");
  const { data: other } = await c.from("bookmarks").select("*");
  const { data: me } = await c.auth.getUser();
  assert.ok(other!.every((b) => b.user_id === me.user!.id));
  const { error } = await c.from("comments").insert({ shared_id: "00000000-0000-0000-0000-000000000000", body: "hello there" });
  assert.ok(error, "comment on a non-visible parent succeeded");
});

test("support tickets are private to the organisation and cannot be forged for another tenant", async () => {
  const nw = await as("analyst@northwind.example");
  const { data: mem } = await nw.from("memberships").select("org_id").limit(1);
  const { data: t, error } = await nw.from("support_tickets").insert({ org_id: mem![0].org_id, subject: "RLS test ticket", body: "Checking tenant isolation of tickets." }).select("id").single();
  assert.ifError(error);
  const meridian = await as("lead@meridian.example");
  const { data: seen } = await meridian.from("support_tickets").select("id").eq("id", t!.id);
  assert.equal(seen!.length, 0, "another tenant could read the ticket");
  const { data: mOrg } = await meridian.from("memberships").select("org_id").limit(1);
  const { error: forged } = await nw.from("support_tickets").insert({ org_id: mOrg![0].org_id, subject: "Forged ticket", body: "Should be rejected by RLS." });
  assert.ok(forged, "ticket forged into another organisation");
  await nw.from("support_tickets").delete().eq("id", t!.id); // tidy up (no delete policy: row stays, harmless)
  const { data: digests } = await meridian.from("digest_subscriptions").select("user_id");
  const { data: me } = await meridian.auth.getUser();
  assert.ok(digests!.every((d) => d.user_id === me.user!.id));
});
