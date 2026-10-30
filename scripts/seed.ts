// Seeds synthetic orgs, personas, catalogue, content, and runs the SME seasonality scenario
// through the real RPCs as each persona (so RLS and workflow rules are exercised).
// Usage: node --env-file=.env.local scripts/seed.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AZENTIO_VIDEOS, embedUrl } from "../src/lib/videos.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Azentio-2026!";
if (!url || !anon || !service) throw new Error("Missing Supabase env vars");

const admin = createClient(url, service, { auth: { persistSession: false } });

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, label: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
  return data;
}

const ORGS = [
  { slug: "azentio", name: "Azentio", kind: "internal", industry: null, region: null },
  { slug: "northwind-bank", name: "Northwind Bank (synthetic)", kind: "client", industry: "Retail & SME banking", region: "Middle East" },
  { slug: "meridian-finance", name: "Meridian Finance (synthetic)", kind: "client", industry: "Non-bank lending", region: "South Asia" },
  { slug: "sunda-coop", name: "Sunda Cooperative Bank (synthetic)", kind: "client", industry: "Cooperative banking", region: "South-East Asia" },
  { slug: "atlas-insurance", name: "Atlas Insurance (synthetic)", kind: "client", industry: "Insurance", region: "Africa" },
] as const;

const OFFERINGS = [
  { slug: "credit-strategy-simulator", name: "Credit Strategy Simulator", category: "Credit Policy Intelligence",
    tagline: "Test credit policy changes before deployment.",
    description: "Simulate the likely effects of credit policy changes on approvals, risk and portfolio outcomes before they go live." },
  { slug: "sme-credit-decisioning", name: "SME Credit Decisioning Workbench", category: "Explainable Credit Intelligence",
    tagline: "Financial analysis, policy checks and recommendations in one workbench.",
    description: "Combines financial analysis, policy checks, risk review and explainable recommendations with human oversight." },
  { slug: "similar-portfolio-intelligence", name: "Similar Portfolio Intelligence", category: "Contextual Portfolio Insights",
    tagline: "Compare applications with historical portfolio segments.",
    description: "Surfaces patterns, risk signals and comparable outcomes by comparing applications with historical segments." },
  { slug: "riva", name: "RIVA", category: "Reporting Intelligence, Validation & Analytics",
    tagline: "Configurable reporting, validation and analytics.",
    description: "Connects data sources, maps report fields, validates data and streamlines regulatory and management reporting." },
  { slug: "financial-analysis-intelligence", name: "Financial Analysis Intelligence", category: "Document & Financial Intelligence",
    tagline: "Spread, analyse and explain financial statements.",
    description: "Extracts and analyses financial statements, producing explainable ratio and trend comparisons for credit teams." },
];

type Persona = { email: string; name: string; org: string; roles: string[]; extra?: { org: string; roles: string[] }[] };
const PERSONAS: Persona[] = [
  { email: "admin@azentio.com", name: "Asha Admin", org: "azentio", roles: ["employee", "portal_admin"] },
  { email: "moderator@azentio.com", name: "Omar Moderator", org: "azentio", roles: ["employee", "moderator"] },
  { email: "publisher@azentio.com", name: "Lena Publisher", org: "azentio", roles: ["employee", "publisher"] },
  { email: "productowner@azentio.com", name: "Ravi Product", org: "azentio", roles: ["employee", "product_owner"] },
  { email: "employee@azentio.com", name: "Mei Employee", org: "azentio", roles: ["employee"] },
  { email: "admin@northwind.example", name: "Nadia (Northwind admin)", org: "northwind-bank", roles: ["client_admin", "client_member"] },
  { email: "analyst@northwind.example", name: "Karim (Northwind analyst)", org: "northwind-bank", roles: ["client_member"] },
  { email: "lead@meridian.example", name: "Priya (Meridian lead)", org: "meridian-finance", roles: ["client_admin", "client_member"] },
  { email: "ops@sunda.example", name: "Budi (Sunda ops)", org: "sunda-coop", roles: ["client_member"],
    extra: [{ org: "meridian-finance", roles: ["client_member"] }] },
  { email: "user@atlas.example", name: "Thandi (Atlas)", org: "atlas-insurance", roles: ["client_member"] },
];

const ENTITLEMENTS: Record<string, string[]> = {
  "northwind-bank": ["sme-credit-decisioning", "financial-analysis-intelligence", "credit-strategy-simulator"],
  "meridian-finance": ["financial-analysis-intelligence", "similar-portfolio-intelligence"],
  "sunda-coop": ["sme-credit-decisioning", "riva"],
  "atlas-insurance": [],
};

async function main() {
  // ---- orgs & offerings
  const orgs = await must(admin.from("organizations").upsert(ORGS as never, { onConflict: "slug" }).select(), "orgs");
  const orgId = (slug: string) => orgs.find((o: { slug: string }) => o.slug === slug)!.id as string;
  const offs = await must(admin.from("offerings").upsert(OFFERINGS, { onConflict: "slug" }).select(), "offerings");
  const offId = (slug: string) => offs.find((o: { slug: string }) => o.slug === slug)!.id as string;

  for (const [org, list] of Object.entries(ENTITLEMENTS)) {
    if (list.length)
      await must(admin.from("entitlements").upsert(list.map((s) => ({ org_id: orgId(org), offering_id: offId(s) }))), "entitlements");
  }

  // ---- federated programme opt-ins (synthetic), with consent history
  const { count: flCount } = await admin.from("fl_participants").select("*", { count: "exact", head: true });
  if (!flCount) {
    const fl = ["northwind-bank", "meridian-finance", "sunda-coop", "atlas-insurance"].map((s) => ({ org_id: orgId(s), status: "opted_in" }));
    await must(admin.from("fl_participants").insert(fl), "fl participants");
    await must(admin.from("fl_consent_history").insert(fl), "fl history");
  }

  // ---- personas
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  const userIds: Record<string, string> = {};
  for (const p of PERSONAS) {
    let user = existing?.users.find((u) => u.email === p.email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: p.name },
      });
      if (error) throw error;
      user = data.user!;
    }
    userIds[p.email] = user.id;
    await must(admin.from("profiles").update({ full_name: p.name, terms_accepted_at: new Date().toISOString() }).eq("id", user.id), "profile");
    for (const m of [{ org: p.org, roles: p.roles }, ...(p.extra ?? [])]) {
      const [mem] = await must(
        admin.from("memberships").upsert({ user_id: user.id, org_id: orgId(m.org), status: "active" }, { onConflict: "user_id,org_id" }).select(),
        "membership",
      );
      await must(admin.from("role_grants").upsert(m.roles.map((role) => ({ membership_id: mem.id, role }))), "grants");
    }
  }
  console.log(`✓ ${PERSONAS.length} personas (password: ${PASSWORD})`);

  // ---- content
  const { count } = await admin.from("content_items").select("*", { count: "exact", head: true });
  if (!count) {
    await must(admin.from("content_items").insert([
      { kind: "banner", title: "Build Intelligence. Create Impact.", body: "From ideas to intelligent products. From complexity to clarity.", audience: "public", is_published: true },
      { kind: "insight", title: "Why explainability matters in SME credit", body: "Credit teams need to see why a recommendation was made, not only what it is. We look at evidence trails, policy checks and human review.", audience: "public", is_published: true },
      { kind: "insight", title: "From reporting burden to reporting intelligence", body: "How configurable validation reduces late-cycle reporting errors.", audience: "public", offering_id: offId("riva"), is_published: true },
      { kind: "broadcast", title: "Internal: Q4 AI Lab all-hands (recording)", body: "Employee-only recording of the AI Lab roadmap session. Do not share externally.", audience: "employee", is_published: true },
      { kind: "experiment", title: "Prototype: agentic covenant monitoring", body: "Early experiment notes. Internal prototype, not a product commitment.", audience: "employee", is_published: true },
      { kind: "knowledge", title: "Playground scenario authoring guide", body: "How to write synthetic scenarios and label simulated outputs.", audience: "employee", is_published: true, review_due: "2027-01-31" },
      { kind: "release_note", title: "Financial Analysis Intelligence 3.2 (client release notes)", body: "Improved ratio explanations and peer comparison filters.", audience: "entitled", offering_id: offId("financial-analysis-intelligence"), is_published: true },
      { kind: "session", title: "Client webinar: Seasonality in SME lending", body: "Invitation-only webinar for client participants.", audience: "client_all", starts_at: "2026-11-12T10:00:00Z", is_published: true },
      { kind: "briefing", title: "Northwind quarterly briefing pack", body: "Organisation-specific briefing for Northwind Bank.", audience: "client_org", org_id: orgId("northwind-bank"), is_published: true },
      { kind: "session", title: "SME Credit Decisioning office hours", body: "Entitled clients only.", audience: "entitled", offering_id: offId("sme-credit-decisioning"), starts_at: "2026-11-05T09:00:00Z", is_published: true },
      ...AZENTIO_VIDEOS.map((v) => ({ kind: "video", title: v.title, body: v.category, external_url: embedUrl(v.id), audience: "public", is_published: true })),
    ]), "content");
  }

  // ---- scenario, run as real users through RPCs
  const { count: shared } = await admin.from("shared_contributions").select("*", { count: "exact", head: true });
  if (shared) return console.log("✓ scenario already seeded");

  const as = async (email: string) => {
    const c = createClient(url, anon, { auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw error;
    return c;
  };
  const fai = offId("financial-analysis-intelligence");
  const draft = async (c: SupabaseClient, org: string, f: Record<string, unknown>) =>
    (await must(c.from("contributions").insert({
      org_id: orgId(org), kind: "market_observation", offering_id: fai, evidence_type: "direct_experience",
      confidence: "medium", visibility: "proposed_shared", consent_process: true, consent_publish: true, ...f,
    }).select("id").single(), "draft")).id as string;

  const nw = await as("analyst@northwind.example");
  const mf = await as("lead@meridian.example");
  const sd = await as("ops@sunda.example");
  const mod = await as("moderator@azentio.com");
  const po = await as("productowner@azentio.com");

  const c1 = await draft(nw, "northwind-bank", {
    title: "Seasonal SME cash flow scored as deterioration",
    body: "Agri-supply SME applicants show strong Q4 revenue and weak Q2. Year-on-year ratio comparisons flag the Q2 dip as deterioration, causing manual overrides at our Dubai Marina branch.",
    industry: "Agri-supply SMEs", region: "UAE", period_start: "2026-04-01", period_end: "2026-06-30",
  });
  const c2 = await draft(mf, "meridian-finance", {
    title: "Festival-season retailers penalised by trailing averages",
    body: "Retail SMEs with festival-season peaks look volatile under trailing 6-month averages, so credit analysts manually re-explain the pattern in most files.",
    industry: "Retail SMEs", region: "Mumbai", period_start: "2026-01-01", period_end: "2026-06-30", consent_attribution: true,
  });
  const c3 = await draft(sd, "sunda-coop", {
    title: "Harvest-cycle borrowers need season-aware comparison",
    body: "Cooperative members tied to rice harvest cycles show inconsistent treatment of cash flow between analysts; there is no seasonal baseline to compare against.",
    industry: "Agricultural cooperatives", region: "Central Java", period_start: "2026-03-01", period_end: "2026-08-31", confidence: "low",
  });
  for (const [c, id] of [[nw, c1], [mf, c2], [sd, c3]] as const) await must(c.rpc("submit_contribution", { p_id: id }), "submit");

  const publish = (id: string, shared: object, attr = false) =>
    must(mod.rpc("moderate_contribution", { p_id: id, p_action: "publish", p_shared: shared, p_include_attribution: attr,
      p_internal_note: "Removed branch-level location; coarsened region and period." }), "publish");

  await publish(c1, { title: "Seasonal SME cash flow scored as deterioration", industry: "Agri-supply SMEs", region: "Middle East", period_label: "Q2 2026",
    body: "Agri-supply SME applicants show strong Q4 and weak Q2 revenue. Year-on-year ratio comparisons flag the Q2 dip as deterioration, leading to manual overrides." });
  await must(mod.rpc("moderate_contribution", { p_id: c3, p_action: "return",
    p_public_reason: "Could you clarify roughly how many files this affected and whether analysts used any workaround?" }), "return");
  await must(sd.from("contributions").update({
    body: "Cooperative members tied to rice harvest cycles show inconsistent treatment of cash flow between analysts (roughly a third of reviewed files); analysts work around it with free-text notes because there is no seasonal baseline.",
  }).eq("id", c3), "amend");
  await must(sd.rpc("submit_contribution", { p_id: c3 }), "resubmit");
  await publish(c2, { title: "Festival-season retailers penalised by trailing averages", industry: "Retail SMEs", region: "South Asia", period_label: "H1 2026",
    body: "Retail SMEs with festival-season peaks look volatile under trailing 6-month averages, so analysts manually re-explain the pattern." }, true);
  await publish(c3, { title: "Harvest-cycle borrowers need a season-aware baseline", industry: "Agricultural cooperatives", region: "South-East Asia", period_label: "2026",
    body: "Borrowers tied to harvest cycles see inconsistent cash-flow treatment between analysts (about a third of reviewed files); analysts rely on free-text notes because there is no seasonal baseline." });

  // one item left in the moderation queue for the live demo
  const c4 = await draft(nw, "northwind-bank", {
    kind: "product_gap", title: "Peer comparison lacks sector seasonality filter",
    body: "When comparing to peers we cannot filter by seasonal sector, so contact client at +971 50 123 4567 for details. Account 123456789012 is an example.",
    industry: "Agri-supply SMEs", region: "UAE", period_start: "2026-07-01", period_end: "2026-09-30",
  });
  await must(nw.rpc("submit_contribution", { p_id: c4 }), "submit c4");
  // private and org-only examples
  await draft(nw, "northwind-bank", { visibility: "private", consent_publish: false, title: "Private note: check Q3 overrides",
    body: "Personal draft: compare Q3 manual overrides with the agri-supply segment before raising anything.", period_start: "2026-07-01", period_end: "2026-09-30" });

  const { data: sharedRows } = await mod.from("shared_contributions").select("id").eq("status", "published");
  const [theme] = await must(po.from("themes").insert({
    title: "Seasonality context", offering_id: fai, created_by: userIds["productowner@azentio.com"],
    summary: "Several organisations report that seasonal cash-flow patterns are treated inconsistently or read as deterioration by year-on-year and trailing-average comparisons.",
    limitations: "Small sample from three synthetic organisations; self-reported; not evidence of market prevalence or causation.",
  }).select(), "theme");
  await must(po.from("theme_links").insert(sharedRows!.map((r) => ({ theme_id: theme.id, shared_id: r.id }))), "links");
  const [idea] = await must(po.from("improvement_ideas").insert({
    title: "Seasonality-aware comparison explanation", offering_id: fai, theme_id: theme.id,
    problem: "Ratio comparisons ignore seasonal revenue cycles, producing misleading deterioration flags.",
    proposed_outcome: "Add a seasonal baseline option and explain when a dip matches the borrower's historical season.",
    owner_team: "Financial Analysis Intelligence product team", owner_id: userIds["productowner@azentio.com"],
    priority: "high", visible_to_clients: true,
  }).select(), "idea");
  await must(po.from("idea_evidence").insert(sharedRows!.map((r) => ({ idea_id: idea.id, shared_id: r.id }))), "evidence");
  await must(po.rpc("set_idea_status", { p_idea: idea.id, p_status: "under_review", p_note: "Linked to Seasonality context theme",
    p_public_update: "We are reviewing how to explain seasonal patterns in comparisons. This is under review and not a committed delivery." }), "status");

  const emp = await as("employee@azentio.com");
  await must(emp.from("experiments").insert({ title: "Seasonal baseline prototype for ratio comparisons", team: "Build Labs team 3",
    summary: "Testing whether a 3-year seasonal baseline reduces false deterioration flags on the synthetic agri-supply portfolio.", offering_id: fai, status: "running" }), "experiment");
  await must(admin.from("content_items").update({ owner_id: userIds["publisher@azentio.com"] }).in("kind", ["knowledge", "release_note", "experiment"]), "owners");
  console.log("✓ SME seasonality scenario seeded");
}

main().catch((e) => { console.error(e); process.exit(1); });
