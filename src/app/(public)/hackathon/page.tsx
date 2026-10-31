import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ButtonLink, Container, PageHeader } from "@/components/ui";
import { BuildCta } from "@/components/sections";
import { PAST_HACKATHONS } from "@/lib/hackathons";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: "Hackathons" };

export default function Hackathons() {
  return (
    <>
      <Container>
        <PageHeader eyebrow="Hackathons" title="Azentio.ai Hackathons"
          actions={<ButtonLink href="/hackathon/register">Register interest <ArrowRight size={16} aria-hidden /></ButtonLink>}>
          We run hiring hackathons with HackCulture. Teams work on real Azentio.ai problem statements and demo what they built to our technology leaders.
        </PageHeader>
      </Container>

      <Container className="pb-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line-strong pb-4">
          <h2 className="display-md">Past hackathons</h2>
          <span className="text-sm text-muted">{PAST_HACKATHONS.length} event{PAST_HACKATHONS.length === 1 ? "" : "s"}</span>
        </div>
        <div className="grid gap-6">
          {PAST_HACKATHONS.map((h) => (
            <article key={h.slug} className="group grid overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-[1.15fr_1fr]">
              <Link href={`/hackathon/${h.slug}`} className="block overflow-hidden bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.banner} alt={`${h.name} banner`} className="aspect-video h-full w-full object-cover transition duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02]" />
              </Link>
              <div className="flex flex-col justify-between gap-6 p-6 lg:p-8">
                <div>
                  <p className="eyebrow text-brand-ink">{h.kind} · {h.status}</p>
                  <h3 className="title-sm mt-2 text-2xl">{h.name}</h3>
                  <p className="mt-1 text-muted">{h.tagline}</p>
                  <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {[["Dates", h.dates], ["Location", `${h.location} · Offline`], ["Prize pool", h.totalPrize], ["Registrations", h.registrations]].map(([k, v]) => (
                      <div key={k}><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={`/hackathon/${h.slug}`} variant="dark">View details <ArrowRight size={16} aria-hidden /></ButtonLink>
                  <a href={h.registerUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-sm font-bold hover:border-brand-ink">
                    Register on HackCulture <ArrowUpRight size={16} aria-hidden />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>

      <BuildCta title="Want to Hear About the Next One?" text="Leave your details and we will email you when registration opens." />
    </>
  );
}
