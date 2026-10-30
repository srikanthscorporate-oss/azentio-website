import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, PageHeader } from "@/components/ui";
import { BuildCta } from "@/components/sections";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: "Solutions" };

const SOLUTIONS = [
  ["Smarter Credit Decisions", "Bring evidence, policy and analysis together so every credit decision is explainable.", "sme-credit-decisioning"],
  ["Adaptive Credit Strategies", "Test policy changes on approvals and risk before they reach production.", "credit-strategy-simulator"],
  ["Intelligent Reporting", "Map, validate and generate reports with a full audit history.", "riva"],
  ["Portfolio Intelligence", "Compare applications with similar historical cohorts for added context.", "similar-portfolio-intelligence"],
  ["Operational Intelligence", "Understand rejections and turn documents into structured, validated data.", "rejection-intelligence"],
  ["Knowledge & Content Intelligence", "Persona-specific drafts from relevant news, with editorial control kept by people.", "persona-newsroom"],
] as const;

export default function Solutions() {
  return (
    <>
      <Container>
        <PageHeader eyebrow="Solutions" title="Real Challenges. Intelligent Solutions.">
          Practical AI for the problems financial institutions face every day.
        </PageHeader>
      </Container>
      <Container className="pb-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map(([t, d, slug], i) => (
            <li key={t} data-reveal>
              <Link href={`/products/${slug}`} className="group flex h-full flex-col rounded-[10px] border border-line p-6 transition-shadow hover:shadow-[0_18px_38px_#171b3a24]">
                <span className="text-xs font-bold text-brand-ink">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-5 text-lg font-bold">{t}</span>
                <span className="mt-2 flex-1 text-sm text-muted">{d}</span>
                <span className="mt-5 flex items-center gap-1 text-sm font-bold text-brand-ink">See the product <ArrowUpRight size={14} aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
      <BuildCta />
    </>
  );
}
