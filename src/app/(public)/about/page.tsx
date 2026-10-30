import { Card, Container, PageHeader } from "@/components/ui";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export const metadata = { title: "About" };

const STEPS = [
  ["Contribute privately", "Clients record observations as private drafts. Saving never shares anything."],
  ["Choose who sees it", "Private to you, your organisation, or proposed to the learning community. Four separate consents: processing, publishing, attribution and training."],
  ["Moderated and de-identified", "Moderators publish a separate reviewed copy with identifying details removed. The private original stays private."],
  ["Themes, with honest numbers", "Themes count distinct organisations and are suppressed below a minimum cohort. Popularity is not market prevalence."],
  ["Improvements, communicated", "Product owners link themes to improvement ideas and share plain-language status, not private roadmaps."],
  ["Withdraw any time", "Withdrawal removes a contribution from the feed, search and AIRA immediately. Copies already viewed cannot be recalled."],
];

export default function About() {
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="About" title="Azentio builds trusted enterprise AI">
        Products for credit decisioning, financial analysis and reporting, built with human oversight and auditability.
      </PageHeader>
      <h2 className="mb-4 text-xl font-semibold">How collective learning works</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map(([t, d], i) => (
          <Card key={t}>
            <p className="text-sm font-semibold text-brand-ink">Step {i + 1}</p>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </Card>
        ))}
      </div>
      <div className="mt-10 max-w-3xl rounded-[10px] border border-line p-6">
        <h2 className="title-sm">Withdrawal service level</h2>
        <p className="mt-2 text-sm text-muted">
          Withdrawing a shared contribution takes effect immediately: in the same database transaction it leaves the shared feed,
          search, themes, idea evidence and AIRA answers, well inside the 60-second requirement. Our production commitment for any
          future external search index or cache is removal within 60 seconds. Copies already viewed by others, and anything copied
          outside the portal, cannot be recalled automatically. Withdrawal never claims to undo a model that has already been trained.
        </p>
      </div>
      <p className="mt-8 max-w-3xl text-sm text-muted">
        The collective learning hub shares reviewed observations; it does not train models. Federated machine learning, where
        client environments train locally and only model updates are aggregated, is a separate opt-in programme.
      </p>
    </Container>
  );
}
