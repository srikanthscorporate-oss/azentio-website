# azentio.ai: Website & Intelligent Collaboration Portal

Azentio Build Labs hackathon entry. A public website plus a role-based, multi-tenant portal where clients contribute
market observations, moderators publish de-identified shared versions, and product owners turn recurring themes into
improvement ideas.

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Postgres + RLS, Auth, Storage) · Vercel · Resend (P1)

## Security model
- **Authorization lives in Postgres.** Every table has row-level security; workflow changes go through `security definer`
  functions (`submit_contribution`, `moderate_contribution`, `withdraw_contribution`, `resolve_report`, `set_idea_status`,
  `accept_invitation`, ...). Direct REST/API calls with the public anon key obey the same rules as the UI.
- The app layer adds role checks (`src/lib/session.ts`) and never trusts client-supplied tenant IDs: new records take the
  org from the server-validated active workspace; the workspace cookie is honoured only if it matches an active membership.
- Roles are separate grants: `employee`, `moderator`, `publisher`, `product_owner`, `portal_admin` (internal org only) and
  `client_member`, `client_admin` (client orgs only; enforced by trigger). Employee ≠ admin.
- Shared contributions live in a **separate table with no tenant/author columns**. The link to the private source
  (`shared_sources`) is readable by moderators only.
- Moderators never see drafts or organisation-only content. Admins do not get blanket access to private contributions.
- Media sits in a private bucket and is served via `/api/media/[id]` only after an RLS-scoped access check (60s signed URL).
- Audit log for role/membership changes, invitations, submissions, moderation, reports, withdrawals and idea status.

## Collective learning
- Contributions start as **private drafts**. Visibility: private · organisation · proposed for the community.
- Four independent consents: process, publish reviewed copy, attribution, training, each with its own history.
- Server-side sensitive-content scan on submit (account/card numbers, emails, phones, credentials, banking IDs, pricing terms);
  flags go to the moderator. Not a privacy guarantee.
- Moderator redacts into a separate shared copy, can request clarification, reject, or publish. Material edits create a new
  version that needs a fresh review; the previous shared version stays until then.
- Reports > temporary unpublish > restore/remove, with reasons sent to the contributor (reporter is never disclosed).
- **Withdrawal is synchronous**: one transaction marks the shared copy withdrawn; feed, search, themes, idea evidence and AIRA
  all filter `status = 'published'`, so it disappears immediately. *Production SLA: immediate for portal surfaces; any future
  external index/cache must be purged within 60s via the same transaction outbox.* Already-viewed copies cannot be recalled.
- Theme stats count **distinct organisations** and are suppressed below `app_config.min_cohort_orgs` (default 3).
- Notifications are in-app; email rows are written to `email_outbox` as `queued` and are never labelled delivered.
- AIRA (`/api/aira`) retrieves only the viewer's RLS-visible published shared contributions, then asks a free OpenRouter
  model (`OPENROUTER_API_KEY`, models in `src/lib/aira.ts`) for a short cited summary. Only those approved, de-identified
  sources are sent to the model; citations to sources that were not supplied are stripped. If the model is unavailable,
  AIRA falls back to an extractive cited answer and labels it. Retrieval and summary, not model training.

## Federated learning (P2)
A separate opt-in programme in [`federated/`](federated/README.md): 4 isolated synthetic client datasets, local training
in separate processes, clipped updates, validation (norm, shape, direction), minimum cohort, FedAvg, holdout evaluation
against baselines, dropout and poisoning scenarios, and a human-reviewed model registry at `/employee/federated`.
Secure aggregation and differential privacy are not implemented and not claimed.

## Run locally
```bash
npm install
# .env.local (required): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
#   for migrations: SUPABASE_DB_URL
#   optional: OPENROUTER_API_KEY (AIRA summaries), RESEND_API_KEY + CRON_SECRET (email outbox, weekly digests),
#             SUPPORT_WEBHOOK_URL / SUPPORT_WEBHOOK_TOKEN (forward support tickets to a helpdesk)
npm run db:push        # apply migrations in supabase/migrations
npm run db:seed        # synthetic orgs, personas, catalogue, SME seasonality scenario
npm run dev
npm run test:rls       # API-level access-control tests
npm run test:e2e       # browser journeys (needs a running server on :3100 or BASE_URL)
cd federated && uv run azentio-fl setup && uv run --env-file ../.env.local azentio-fl run --publish
```

## Demo personas (synthetic)
Sign in at `/login` > "Judging personas" with `DEMO_PASSWORD`.

| Email | Role |
|---|---|
| analyst@northwind.example | Client member (Northwind) |
| admin@northwind.example | Client admin (Northwind) |
| lead@meridian.example | Client admin (Meridian) |
| ops@sunda.example | Client member in two orgs (workspace switcher) |
| user@atlas.example | Client with no entitlements (empty states) |
| employee@azentio.com | Employee |
| moderator@azentio.com | Learning moderator |
| productowner@azentio.com | Product owner |
| publisher@azentio.com | Content publisher |
| admin@azentio.com | Portal administrator |

## Demo script: SME seasonality
1. Public: home > product > request demo.
2. `analyst@northwind` > dashboard (entitlements, sessions, idea status) > Learning hub > ask AIRA "seasonal cash flow".
3. `moderator` > queue > open the flagged "Peer comparison..." item > redact > publish.
4. `user@atlas` > theme "Seasonality context": 3 distinct orgs, limitations, idea *Under review*.
5. `productowner` > idea > change status with a client-safe update.
6. `analyst@northwind` > withdraw a published item > it vanishes from feed/AIRA instantly.
7. `ops@sunda` > switch workspace between Sunda and Meridian.
8. `admin@northwind` > invite member; try to reach `/admin` > forbidden.

## Collaboration extras (doc section 10 and client portal extras)
- Suggested themes: TF-IDF clustering of approved, unthemed contributions (`src/lib/clustering.ts`), shown to product owners
  with evidence links and an explicit "text similarity only" uncertainty label. Nothing becomes a theme automatically.
- Trend-change summary on each theme (recent vs earlier supporting contributions), hidden below the minimum cohort.
- Weekly digests: opt-in from the Learning hub; `/api/cron/digest` (Vercel Cron, daily) sends at most one per 7 days.
- Support tickets at `/client/support`: private to the organisation, optional helpdesk webhook, worked from `/admin`.
- Client resources at `/client/resources`: organisation, entitlement and all-client content, filtered by RLS.
