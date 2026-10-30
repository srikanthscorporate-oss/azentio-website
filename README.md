# azentio.ai: Website & Intelligent Collaboration Portal

Azentio Build Labs hackathon entry. A public website plus a role-based, multi-tenant portal where clients contribute
market observations, moderators publish de-identified shared versions, and product owners turn recurring themes into
improvement ideas.

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Postgres + RLS, Auth, Storage) · Vercel · Resend (P1)

## Security model
- **Authorization lives in Postgres.** Every table has row-level security; workflow changes go through `security definer`
  functions (`submit_contribution`, `moderate_contribution`, `withdraw_contribution`, `resolve_report`, `set_idea_status`,
  `accept_invitation`, …). Direct REST/API calls with the public anon key obey the same rules as the UI.
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
- Reports → temporary unpublish → restore/remove, with reasons sent to the contributor (reporter is never disclosed).
- **Withdrawal is synchronous**: one transaction marks the shared copy withdrawn; feed, search, themes, idea evidence and AIRA
  all filter `status = 'published'`, so it disappears immediately. *Production SLA: immediate for portal surfaces; any future
  external index/cache must be purged within 60s via the same transaction outbox.* Already-viewed copies cannot be recalled.
- Theme stats count **distinct organisations** and are suppressed below `app_config.min_cohort_orgs` (default 3).
- Notifications are in-app; email rows are written to `email_outbox` as `queued` and are never labelled delivered.
- AIRA (`/api/aira`) retrieves only the viewer's RLS-visible published shared contributions and returns cited, extractive
  answers with explicit limitations. Retrieval, not model training.

## Run locally
```bash
npm install
# .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, DEMO_PASSWORD
npm run db:push        # apply migrations in supabase/migrations
npm run db:seed        # synthetic orgs, personas, catalogue, SME seasonality scenario
npm run dev
npm run test:rls       # API-level access-control tests
npm run test:e2e       # browser journeys (needs a running server on :3100 or BASE_URL)
```

## Demo personas (synthetic)
Sign in at `/login` → "Judging personas" with `DEMO_PASSWORD`.

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
1. Public: home → product → request demo.
2. `analyst@northwind` → dashboard (entitlements, sessions, idea status) → Learning hub → ask AIRA "seasonal cash flow".
3. `moderator` → queue → open the flagged "Peer comparison…" item → redact → publish.
4. `user@atlas` → theme "Seasonality context": 3 distinct orgs, limitations, idea *Under review*.
5. `productowner` → idea → change status with a client-safe update.
6. `analyst@northwind` → withdraw a published item → it vanishes from feed/AIRA instantly.
7. `ops@sunda` → switch workspace between Sunda and Meridian.
8. `admin@northwind` → invite member; try to reach `/admin` → forbidden.
