import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { Container } from "@/components/ui";
import { BUILD_LABS as H } from "@/lib/hackathons";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: H.name, description: `${H.kind}: ${H.tagline}` };

const SECTIONS = [["overview", "Overview"], ["schedule", "Schedule"], ["themes", "Themes"], ["prizes", "Prizes"], ["partners", "Partners"], ["eligibility", "Eligibility"], ["rules", "Rules"], ["faqs", "FAQs"], ["support", "Support"]] as const;

function Register({ className = "" }: { className?: string }) {
  return (
    <a href={H.registerUrl} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-navy transition-colors hover:bg-[#7ddca3] ${className}`}>
      Register on HackCulture <ArrowUpRight size={16} aria-hidden />
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line-strong pt-8">
      <h2 className="display-md mb-6">{title}</h2>
      {children}
    </section>
  );
}

const Ticks = ({ items }: { items: readonly string[] }) => (
  <ul className="grid gap-3 sm:grid-cols-2">
    {items.map((t) => <li key={t} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-brand-ink" aria-hidden />{t}</li>)}
  </ul>
);

export default function BuildLabs() {
  return (
    <>
      {/* Banner on the light page background, matching the event artwork */}
      <div className="bg-bg">
        <Container className="pb-10 pt-8">
          <Link href="/hackathon" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={14} aria-hidden /> All hackathons</Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={H.banner} alt={`${H.name}: ${H.kind}. ${H.tagline}`} className="w-full rounded-xl border border-line" />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-brand-ink">{H.kind} · Past hackathon</p>
              <h1 className="display-lg mt-2">{H.name}</h1>
              <p className="title-sm mt-2 text-muted">{H.tagline}</p>
            </div>
            <Register />
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
            {[["Dates", H.dates], ["Location", `${H.location} · ${H.mode}`], ["Team", H.teamSize], ["Status", `${H.status} · ${H.registrations} registrations`]].map(([k, v]) => (
              <div key={k} className="bg-surface p-4"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Container>
      </div>

      <Container className="grid gap-12 py-12 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-28 grid gap-2 text-sm">
            {SECTIONS.map(([id, l]) => <li key={id}><a href={`#${id}`} className="text-muted hover:text-ink">{l}</a></li>)}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-14">
          <Section id="overview" title="Overview">
            <div className="grid gap-4 text-muted">{H.overview.map((p) => <p key={p}>{p}</p>)}</div>
            <div className="hero-glow mt-8 rounded-xl p-6 text-white md:p-8">
              <p className="eyebrow text-brand">The challenge</p>
              <p className="title-sm mt-3">{H.challenge}</p>
            </div>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div><h3 className="title-sm mb-4">Hackathon highlights</h3><Ticks items={H.highlights} /></div>
              <div><h3 className="title-sm mb-4">Why participate?</h3><Ticks items={H.why} /></div>
            </div>
            <p className="title-sm mt-8 text-brand-ink">Build something that matters. Show what AI can make possible.</p>
          </Section>

          <Section id="schedule" title="Schedule">
            <ol className="grid gap-4">
              {H.schedule.map((s) => (
                <li key={s.title} className="grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[4.5rem_1fr]">
                  <div className="grid h-16 w-16 place-items-center rounded-lg bg-brand-soft text-center leading-tight text-brand-ink">
                    <span><span className="block text-2xl font-semibold">{s.day}</span><span className="text-xs uppercase">{s.month}</span></span>
                  </div>
                  <div>
                    <h3 className="title-sm">{s.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-brand-ink">{s.mode}</p>
                    <p className="mt-2 text-muted">{s.text}</p>
                    <p className="mt-3 text-sm">{s.window}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="themes" title="Themes">
            <div className="rounded-xl border border-dashed border-line-strong p-6">
              <p className="eyebrow text-brand-ink">Revealing soon</p>
              <p className="mt-2 text-muted">{H.themes}</p>
            </div>
          </Section>

          <Section id="prizes" title="Prizes">
            <p className="mb-6 text-muted">{H.prizeNote}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {H.prizes.map(([t, v, d], i) => (
                <div key={t} className={`rounded-xl p-6 ${i === 0 ? "hero-glow text-white" : "border border-line bg-surface"}`}>
                  <p className={`text-sm font-semibold ${i === 0 ? "text-brand" : "text-brand-ink"}`}>{t}</p>
                  <p className="display-md mt-2">{v}</p>
                  <p className={`mt-3 text-sm ${i === 0 ? "text-white/75" : "text-muted"}`}>{d}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="partners" title="Our partners">
            <div className="grid gap-4 md:grid-cols-2">
              {H.partners.map(([n, r, d]) => (
                <div key={n} className="rounded-xl border border-line bg-surface p-6">
                  <p className="title-sm">{n}</p>
                  <p className="text-sm font-semibold text-brand-ink">{r}</p>
                  <p className="mt-3 text-sm text-muted">{d}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="eligibility" title="Eligibility">
            <p><span className="text-muted">Profile type:</span> <span className="font-semibold">{H.eligibility}</span></p>
          </Section>

          <Section id="rules" title="Rules">
            <ol className="border-t border-line">
              {H.rules.map(([t, d], i) => (
                <li key={t} className="grid gap-1 border-b border-line py-5 sm:grid-cols-[3rem_1fr]">
                  <span className="text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span><span className="title-sm block">{t}</span><span className="mt-1 block text-muted">{d}</span></span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="faqs" title="FAQs">
            <div className="grid gap-3">
              {H.faqs.map(([q, a]) => (
                <details key={q} className="group rounded-xl border border-line bg-surface p-5 open:border-brand/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}<span className="text-xl text-brand-ink transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-3 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </Section>

          <Section id="support" title="Support">
            <p className="mb-6 text-muted">Our team is here to help you with any queries or concerns.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {H.support.map(([n, r, e]) => (
                <div key={e} className="rounded-xl border border-line bg-surface p-5">
                  <p className="font-semibold">{n}</p><p className="text-sm text-muted">{r}</p>
                  <a href={`mailto:${e}`} className="mt-2 inline-block text-sm text-brand-ink underline-offset-4 hover:underline">{e}</a>
                </div>
              ))}
            </div>
            <div className="hero-glow mt-10 flex flex-wrap items-center justify-between gap-6 rounded-xl p-6 text-white md:p-8">
              <div>
                <p className="title-sm">{H.totalPrize} in prizes · {H.teamSize}</p>
                <p className="mt-1 text-sm text-white/70">Registration and the full event page are hosted on HackCulture.</p>
              </div>
              <Register />
            </div>
          </Section>
        </div>
      </Container>
    </>
  );
}
