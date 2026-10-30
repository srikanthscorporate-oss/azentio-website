import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Container } from "@/components/ui";
import { LiteYouTube } from "@/components/lite-youtube";
import { videoCategory, videoIdFromUrl } from "@/lib/videos";

const CAPABILITIES = ["Intelligent Decisioning", "Document Intelligence", "AI Agents & Automation", "Analytics & Insights", "Configurable AI Platforms", "Trusted Enterprise AI"];

const PROCESS = [
  ["Contribute", "Clients record market observations as private drafts. Saving never shares anything."],
  ["Review", "Moderators publish a separate, de-identified copy, only with explicit consent."],
  ["Learn", "Themes count distinct organisations, with limitations stated, never popularity as proof."],
  ["Improve", "Product owners link evidence to improvement ideas and report status back in plain language."],
];

const TRUST = ["Identity & SSO", "Role-based access", "Tenant isolation", "Auditability", "Data protection", "Human oversight"];

export default async function Home() {
  const supabase = await createClient();
  const [{ data: offerings }, { data: videos }] = await Promise.all([
    supabase.from("offerings").select("slug, name, category, tagline").eq("is_public", true).order("name"),
    supabase.from("content_items").select("id, title, external_url").eq("kind", "video").eq("audience", "public").order("created_at", { ascending: false }).limit(4),
  ]);
  const vids = (videos ?? []).map((v) => ({ ...v, vid: videoIdFromUrl(v.external_url) })).filter((v) => v.vid);
  const [featured, ...stories] = vids;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-brand/20 blur-3xl" />
        <Container className="relative flex min-h-[78vh] flex-col justify-between py-16">
          <p className="eyebrow text-white/60">Enterprise AI for financial services</p>
          <div>
            <h1 className="display-xl max-w-5xl">
              Build intelligence.<br /><span className="text-brand">Create shared value.</span>
            </h1>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
              <p className="max-w-xl text-lg text-white/70">
                Explainable AI products for credit, reporting and financial analysis, plus a governed portal where clients and
                Azentio learn together without giving up control of their information.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/products" variant="brand">Explore products <ArrowUpRight size={16} /></ButtonLink>
                <ButtonLink href="/connect" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">Request a demo</ButtonLink>
              </div>
            </div>
          </div>
          <p className="eyebrow mt-12 flex items-center gap-2 text-white/50"><ArrowDown size={14} /> Scroll to explore</p>
        </Container>
        <div className="overflow-hidden border-t border-white/10 py-5" aria-hidden>
          <div className="marquee flex w-max gap-12 whitespace-nowrap text-2xl text-white/40">
            {[...CAPABILITIES, ...CAPABILITIES].map((c, i) => <span key={i}>{c} <span className="text-brand">✦</span></span>)}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-line bg-surface">
        <Container className="py-24">
          <p className="eyebrow text-muted" data-reveal>How collective learning works</p>
          <h2 className="display-lg mt-4 max-w-4xl" data-reveal>Contribute. Review. Learn. Improve.</h2>
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
            {PROCESS.map(([t, d], i) => (
              <div key={t} className="bg-surface p-6" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                <p className="eyebrow text-brand-ink">0{i + 1}</p>
                <p className="mt-10 text-2xl font-medium tracking-tight">{t}</p>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Products as a large list */}
      <Container className="py-24">
        <div className="flex flex-wrap items-end justify-between gap-4" data-reveal>
          <div><p className="eyebrow text-muted">Products</p><h2 className="display-lg mt-4">What we build</h2></div>
          <Link href="/products" className="sweep pb-1 text-sm">All products</Link>
        </div>
        <ul className="mt-12 border-t border-line">
          {offerings?.map((o) => (
            <li key={o.slug} className="border-b border-line" data-reveal>
              <Link href={`/products/${o.slug}`} className="group grid items-center gap-2 py-7 md:grid-cols-[1fr_1.2fr_auto]">
                <span className="display-md transition-colors duration-500 group-hover:text-brand-ink">{o.name}</span>
                <span className="text-muted"><span className="eyebrow mr-3 text-ink">{o.category}</span>{o.tagline}</span>
                <ArrowUpRight className="transition-transform duration-500 [transition-timing-function:var(--ease-inout)] group-hover:-translate-y-1 group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Video */}
      {featured && (
        <section className="bg-navy text-white">
          <Container className="py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div data-reveal>
                <p className="eyebrow text-white/50">{videoCategory(featured.vid)}</p>
                <h2 className="display-md mt-4">{featured.title}</h2>
                <Link href="/media" className="sweep mt-8 inline-block pb-1 text-sm text-white/70">All videos</Link>
              </div>
              <div data-reveal><LiteYouTube id={featured.vid!} title={featured.title} /></div>
            </div>
            {stories.length > 0 && (
              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {stories.map((s) => (
                  <div key={s.id} data-reveal>
                    <LiteYouTube id={s.vid!} title={s.title} />
                    <p className="eyebrow mt-4 text-white/50">{videoCategory(s.vid)}</p>
                    <p className="mt-1 font-medium">{s.title}</p>
                  </div>
                ))}
              </div>
            )}
          </Container>
        </section>
      )}

      {/* Trust + CTA */}
      <Container className="py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="eyebrow text-muted">Trust by design</p>
            <h2 className="display-lg mt-4">Governed, not just gated.</h2>
            <p className="mt-6 max-w-lg text-muted">Access is enforced on the server for every page, API and media request. Shared learning is reviewed, de-identified and withdrawable.</p>
          </div>
          <ul className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-2xl border border-line bg-line" data-reveal>
            {TRUST.map((t) => <li key={t} className="bg-surface p-5 text-sm font-medium"><span className="mr-2 text-brand">●</span>{t}</li>)}
          </ul>
        </div>
        <div className="mt-24 rounded-3xl bg-brand p-10 text-navy md:p-16" data-reveal>
          <h2 className="display-lg max-w-3xl">Let's build intelligence together.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/connect">Start a conversation <ArrowUpRight size={16} /></ButtonLink>
            <ButtonLink href="/login" variant="outline" className="border-navy/20 bg-transparent">Client & employee sign in</ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
