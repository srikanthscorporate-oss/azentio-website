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
  // Full-bleed closing band: pitch on the left, three plain links on the right, wordmark bleeding off the bottom.
  const paths = [
    ["See the products", "/products"],
    ["Tell us about a problem", "/connect"],
    ["Work with the AI Lab", "/lab"],
  ] as const;
  return (
    <section className="hero-glow relative mt-20 overflow-hidden text-white">
      <div aria-hidden className="absolute inset-0 ripples" />
      <Container className="relative grid gap-14 pb-10 pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pt-28">
        <div>
          <p className="eyebrow text-brand">Build what's next</p>
          <h2 className="display-lg mt-4 max-w-2xl">{title}</h2>
          <p className="mt-5 max-w-lg text-white/70">{text}</p>
          <ButtonLink href="/connect" className="mt-10">Start a conversation <ArrowUpRight size={16} aria-hidden /></ButtonLink>
        </div>
        <ul className="grid content-end gap-5 lg:justify-self-end">
          {paths.map(([t, href]) => (
            <li key={t}>
              <a href={href} className="group inline-flex items-baseline gap-3 text-2xl text-white/85 transition-colors hover:text-brand md:text-3xl">
                <span className="border-b border-white/25 pb-1 transition-colors group-hover:border-brand">{t}</span>
                <ArrowUpRight size={20} aria-hidden className="translate-y-0.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </li>
          ))}
        </ul>
      </Container>
      <p aria-hidden className="pointer-events-none relative -mb-[0.22em] select-none px-4 text-[clamp(4rem,19vw,17rem)] leading-none tracking-tight text-white/[0.06] md:px-8 lg:px-12">
        azentio<span className="text-brand/20">.ai</span>
      </p>
    </section>
  );
}
