import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { ButtonLink, Container } from "@/components/ui";

export function SectionHead({ eyebrow, title, aside }: { eyebrow: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl"><p className="eyebrow text-brand-ink">{eyebrow}</p><h2 className="display-lg mt-3">{title}</h2></div>
      {aside && <div className="max-w-sm text-muted">{aside}</div>}
    </div>
  );
}

export function NumberedCards({ items }: { items: readonly (readonly [string, string?])[] }) {
  return (
    <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([t, d], i) => (
        <li key={t} className="rounded-[10px] border border-line bg-surface p-6" data-reveal>
          <p className="text-xs font-bold text-brand-ink">{String(i + 1).padStart(2, "0")}</p>
          <p className="mt-5 font-bold">{t}</p>
          {d && <p className="mt-2 text-sm text-muted">{d}</p>}
        </li>
      ))}
    </ol>
  );
}

// Closing call to action used at the end of public pages (copy from the reference prototype).
export function BuildCta({ title = "The Next Intelligent Idea Starts Here.", text = "Explore our products, share a challenge, or collaborate to turn ambitious ideas into working AI solutions." }: { title?: string; text?: string }) {
  return (
    <Container className="py-20">
      <div className="panel-glow rounded-xl px-8 py-14 text-white md:px-14">
        <p className="eyebrow text-brand">Build what's next</p>
        <h2 className="display-lg mt-3 max-w-3xl">{title}</h2>
        <p className="mt-4 max-w-xl text-white/80">{text}</p>
        <ButtonLink href="/connect" className="mt-8">Start a conversation <ArrowUpRight size={16} aria-hidden /></ButtonLink>
      </div>
    </Container>
  );
}
