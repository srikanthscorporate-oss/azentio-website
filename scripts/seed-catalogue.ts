// Product catalogue and public articles from the reference prototype. Idempotent (upsert by slug / title).
// Usage: node --env-file=.env.local scripts/seed-catalogue.ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export const CATALOGUE = [
  { slug: "credit-strategy-simulator", name: "Credit Strategy Simulator", category: "Credit Policy Intelligence",
    headline: "Test the Strategy. Understand the Impact.", tagline: "Test credit policy changes before deployment.",
    description: "Simulate the likely effects of credit policy changes on approvals, risk and portfolio outcomes before they go live.",
    features: ["Policy scenario configuration", "Approval and risk impact comparison", "Evidence-led simulation"],
    how_it_works: ["Select a portfolio", "Define a strategy", "Run scenarios", "Review impact", "Refine and approve"],
    business_value: ["Evaluate strategy before rollout", "Compare scenarios consistently", "Support informed policy reviews"] },
  { slug: "sme-credit-decisioning", name: "SME Credit Decisioning Workbench", category: "Explainable Credit Intelligence",
    headline: "Every Decision, Backed by Intelligence.", tagline: "Financial analysis, policy checks and recommendations in one workbench.",
    description: "Bring financial analysis, policy evaluation, risk review and credit recommendations into one workbench with evidence and human oversight.",
    features: ["Policy and exception evaluation", "Explainable recommendations", "Human decision controls"],
    how_it_works: ["Capture application", "Collect evidence", "Evaluate policies", "Review recommendation", "Approve or refer"],
    business_value: ["Streamline reviews", "Improve consistency", "Preserve accountability"] },
  { slug: "similar-portfolio-intelligence", name: "Similar Portfolio Intelligence", category: "Contextual Portfolio Insights",
    headline: "Learn from Similarity. Decide with Context.", tagline: "Compare applications with historical portfolio segments.",
    description: "Compare financing applications with relevant historical portfolio segments to surface patterns, risk indicators and comparable outcomes.",
    features: ["Peer cohort discovery", "Portfolio comparisons", "Historical outcome context"],
    how_it_works: ["Select application", "Identify comparable cohort", "Compare indicators", "Review insights"],
    business_value: ["Add context to underwriting", "Reveal comparable patterns", "Support informed review"] },
  { slug: "riva", name: "RIVA", category: "Reporting Intelligence, Validation & Analytics",
    headline: "From Complex Data to Confident Reporting.", tagline: "Configurable reporting, validation and analytics.",
    description: "A configurable reporting environment connecting data sources, mapping report fields, supporting validation and simplifying reporting workflows.",
    features: ["Multi-source data mapping", "Configurable report templates", "Validation and audit history"],
    how_it_works: ["Connect sources", "Configure template", "Map fields", "Validate", "Generate report"],
    business_value: ["Reduce manual mapping", "Improve traceability", "Adapt reporting workflows"] },
  { slug: "rejection-intelligence", name: "Rejection Intelligence", category: "Decision Analytics",
    headline: "Understand Every Rejection. Discover Every Opportunity.", tagline: "Turn declined applications into insight.",
    description: "Categorise rejection reasons, analyse trends and simulate alternatives to understand what drives declined applications.",
    features: ["Reason categorization", "Trend analysis", "Scenario simulation"],
    how_it_works: ["Ingest decisions", "Classify reasons", "Explore patterns", "Simulate alternatives"],
    business_value: ["Understand rejection drivers", "Identify potential improvements", "Explore policy changes"] },
  { slug: "financial-analysis-intelligence", name: "Financial Analysis Intelligence", category: "Document & Financial Intelligence",
    headline: "Numbers Tell a Story. Intelligence Reveals It.", tagline: "Spread, analyse and explain financial statements.",
    description: "Extract and analyse financial statements, producing explainable ratio and trend comparisons for credit teams.",
    features: ["Statement structuring", "Financial ratios and trends", "Evidence-linked analysis"],
    how_it_works: ["Upload statements", "Extract figures", "Analyze metrics", "Review insights"],
    business_value: ["Accelerate review", "Improve consistency", "Make trends visible"] },
  { slug: "document-intelligence", name: "Document Intelligence", category: "Document Intelligence",
    headline: "Documents In. Intelligence Out.", tagline: "Extract, interpret and validate complex documents.",
    description: "Classify documents, extract structured information and route it through validation workflows before it reaches downstream systems.",
    features: ["Document classification", "Structured extraction", "Validation workflows"],
    how_it_works: ["Receive document", "Classify", "Extract", "Validate", "Publish structured data"],
    business_value: ["Reduce manual entry", "Improve information quality", "Enable downstream workflows"] },
  { slug: "persona-newsroom", name: "Persona Newsroom", category: "Knowledge & Content Intelligence",
    headline: "Relevant News. Distinct Perspectives.", tagline: "Persona-specific news drafts with editorial control.",
    description: "Discover relevant news, choose a persona and generate an editable draft that keeps people in control of what is published.",
    features: ["Article repository", "Persona-specific recommendations", "Editable draft generation"],
    how_it_works: ["Discover news", "Choose persona", "Generate draft", "Review and edit"],
    business_value: ["Reduce content preparation time", "Support distinctive viewpoints", "Preserve editorial control"] },
];

const ARTICLES = [
  ["Why Explainability Matters in Credit Decisions", "Credit teams need to see why a recommendation was made, not only what it is. Evidence trails, policy checks and human review make AI-assisted decisions accountable."],
  ["From Reporting Automation to Intelligence", "Automating report generation is only the start. Configurable validation and traceable mappings reduce late-cycle errors and make reporting a source of insight."],
  ["Small Language Models in Financial Services", "Smaller, specialised models can run closer to the data, cost less and be easier to govern. We look at where they fit alongside larger models."],
  ["Engineering Notes", "Notes from the team on building enterprise AI: orchestration, evaluation, human approvals and the trade-offs behind them."],
];

const { error } = await admin.from("offerings").upsert(CATALOGUE.map((o) => ({ ...o, is_public: true })), { onConflict: "slug" });
if (error) throw error;
await admin.from("content_items").delete().eq("kind", "insight").eq("audience", "public");
const { error: e2 } = await admin.from("content_items").insert(ARTICLES.map(([title, body], i) => ({
  kind: "insight", title, body, audience: "public", is_published: true, created_at: new Date(Date.now() - i * 86400000).toISOString(),
})));
if (e2) throw e2;
console.log(`✓ ${CATALOGUE.length} offerings, ${ARTICLES.length} articles`);
