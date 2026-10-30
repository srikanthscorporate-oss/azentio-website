import { Container, PageHeader } from "@/components/ui";
import { BuildCta, NumberedCards, SectionHead } from "@/components/sections";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: "Technology" };

const PILLARS = [
  ["Enterprise Integration", "Connect to core systems, data platforms and identity providers through governed APIs."],
  ["AI Orchestration", "Combine models, workflows, agents, deterministic logic and human approvals."],
  ["Security by Design", "Role-based access, tenant isolation, encryption and audit trails from the start."],
  ["Responsible AI", "Explainable outputs, human oversight and honest claims. Security testing claims require verified evidence."],
] as const;

const LAYERS = [
  ["User Experience", "Workbenches · Copilots · APIs"],
  ["AI Orchestration & Business Logic", "Workflows · Agents · Rules · Approvals"],
  ["Model Intelligence · Enterprise Data · System Integration", "Models · Data platforms · Connectors"],
  ["Trust, Security & Governance", "SSO · RBAC · Encryption · Audit · Monitoring"],
] as const;

export default function Technology() {
  return (
    <>
      <Container>
        <PageHeader eyebrow="Technology" title="Built for Intelligence. Engineered for Trust.">
          The platform principles behind every azentio.ai product.
        </PageHeader>
      </Container>
      <Container className="pb-10">
        <SectionHead eyebrow="Principles" title="How We Build." />
        <NumberedCards items={PILLARS} />
      </Container>
      <section className="bg-bg">
        <Container className="py-20">
          <SectionHead eyebrow="Reference architecture" title="Four Layers. One Governed Platform." />
          <ol className="mt-10 grid gap-3">
            {LAYERS.map(([t, d], i) => (
              <li key={t} className={`grid gap-1 rounded-[10px] border p-5 md:grid-cols-[1fr_1fr] md:items-center ${i === LAYERS.length - 1 ? "border-navy bg-navy text-white" : "border-line bg-surface"}`} data-reveal>
                <span className="font-bold">{t}</span>
                <span className={`text-sm ${i === LAYERS.length - 1 ? "text-brand" : "text-muted"}`}>{d}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">The governance layer spans every layer above it.</p>
        </Container>
      </section>
      <BuildCta />
    </>
  );
}
