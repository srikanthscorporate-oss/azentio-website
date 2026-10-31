import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { getOfferings, getPublicContent } from "@/lib/public-data";
import { HeroVideo } from "@/components/hero-video";
import { IntroLoader } from "@/components/intro-loader";
import { SmoothScroll } from "@/components/smooth-scroll";
import { HScroll } from "@/components/h-scroll";
import { HoverList } from "@/components/hover-list";
import { LiteYouTube } from "@/components/lite-youtube";
import { BuildCta } from "@/components/sections";
import { ProductMock } from "@/components/product-mock";
import { videoCategory, videoIdFromUrl } from "@/lib/videos";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

// Kept off the home page: the loan origination walkthrough stays on /media only.
const HIDDEN_ON_HOME = new Set(["j7M-k4HnOJc"]);

const CAPABILITIES = [
  ["Intelligent Decisioning", "Turn policies, evidence and data into informed recommendations."],
  ["Document Intelligence", "Extract, interpret and validate complex information."],
  ["AI Agents & Automation", "Connect intelligence with workflows and human oversight."],
  ["Analytics & Insights", "Transform data into actionable intelligence."],
  ["Configurable AI Platforms", "Adapt solutions to evolving business requirements."],
  ["Trusted Enterprise AI", "Design for security, accountability and traceability."],
] as const;

const TRUST = ["Identity & SSO", "Role-Based Access", "Auditability", "Data Protection", "Human Oversight", "Secure Deployment"];

const LEARNING = [
  ["Contribute privately", "Clients record observations as private drafts. Saving never shares anything."],
  ["Reviewed and de-identified", "Moderators publish a separate reviewed copy, only with explicit consent."],
  ["Themes with honest numbers", "Distinct organisations are counted, and small groups are suppressed."],
  ["Improvements, reported back", "Product owners link evidence to ideas and share plain-language status."],
] as const;

// Panel colours for the product strip, drawn from the azentio palette (light panels use navy text).
const PANELS = [
  ["#69d393", "dark"], ["#2f6f6a", "light"], ["#d9e4e1", "dark"], ["#171b3a", "light"],
  ["#b8efb5", "dark"], ["#4e8c7a", "light"], ["#c7d3dd", "dark"], ["#10132c", "light"],
] as const;

export default async function Home() {
  const [offerings, videos, insights] = await Promise.all([getOfferings(), getPublicContent("video"), getPublicContent("insight")]);
  const stories = videos.map((v) => ({ ...v, vid: videoIdFromUrl(v.external_url) })).filter((v) => v.vid && !HIDDEN_ON_HOME.has(v.vid)).map((v) => ({ ...v, cat: videoCategory(v.vid) }));
  const counts = stories.reduce<Record<string, number>>((a, s) => ({ ...a, [s.cat]: (a[s.cat] ?? 0) + 1 }), {});
  const [big, ...small] = stories;

  return (
    <>
      <IntroLoader />
      <SmoothScroll />
      {/* 1. Hero: full-bleed video, detail labels at mid height, headline bottom left */}
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <HeroVideo />
        <div className="relative grid min-h-[100svh] grid-rows-[1fr_auto_1fr] px-4 pb-10 pt-24 md:px-8 lg:px-12">
          <div />
          <div className="flex flex-wrap items-center gap-x-16 gap-y-2 text-sm font-medium">
            <span>Enterprise AI + Collaboration</span>
            <span className="hidden sm:inline">A Governed Approach</span>
            <a href="#products" className="group ml-auto hidden items-center gap-3 md:flex">Scroll to explore <span className="circle-btn"><ArrowRight size={14} aria-hidden /></span></a>
          </div>
          <div className="flex flex-col justify-end">
            <p className="eyebrow mb-4 text-brand">Intelligence begins with imagination</p>
            <h1 className="display-xl max-w-5xl">Build Intelligence.<br />Create Impact.</h1>
          </div>
        </div>
      </section>

      {/* 2. Products: pinned horizontal strip (lpas market cards) */}
      <div id="products" className="scroll-mt-0">
        <HScroll label="Products">
          {offerings.map((o, i) => {
            const [bg, tone] = PANELS[i % PANELS.length];
            const light = tone === "light";
            return (
              <article key={o.slug} className="grid w-full grid-cols-[72%_28%] lg:h-full lg:w-[min(52rem,62vw)] lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_15rem]">
                <div className="hero-glow relative order-2 min-h-44 overflow-hidden lg:order-1">
                  <div aria-hidden className="absolute inset-0 ripples" />
                  <ProductMock slug={o.slug} />
                  <p className="absolute bottom-4 right-5 hidden max-w-xs text-right text-sm text-white/70 lg:block">{o.category}</p>
                </div>
                <Link href={`/products/${o.slug}`} style={{ backgroundColor: bg }}
                  className={`group order-1 flex flex-col justify-between gap-6 p-5 lg:order-2 lg:p-8 ${light ? "text-white" : "text-navy"}`}>
                  <span className="circle-btn self-end"><Plus size={16} aria-hidden /></span>
                  <span className="flex flex-wrap items-end justify-between gap-4">
                    <span>
                      <span className="display-md block">{o.name}</span>
                      <span className="mt-2 block text-xs">{i + 1} / {offerings.length}</span>
                    </span>
                    <span className="max-w-[14rem] text-right text-sm">{o.tagline}</span>
                  </span>
                </Link>
              </article>
            );
          })}
        </HScroll>
      </div>

      {/* 3. Intro statement */}
      <section className="grid-template py-24 lg:py-32">
        <h2 className="display-lg intro-title mb-12" data-reveal>
          Intelligence, Engineered for the Real World.
        </h2>
        <p className="intro-tag font-semibold" data-reveal>Decision. Document. Agent. Analytics.</p>
        <div className="intro-body mt-6 grid gap-8 md:mt-0" data-reveal>
          <p className="title-sm text-muted">
            AI creates value when it moves beyond experimentation and becomes part of how businesses operate. We build intelligent
            applications combining domain understanding, advanced AI, intuitive experiences and enterprise-grade engineering.
          </p>
          <Link href="/about" className="group line-link justify-self-start">How we work <span className="circle-btn text-muted"><ArrowRight size={14} aria-hidden /></span></Link>
        </div>
      </section>

      {/* 4. Capabilities as ruled rows */}
      <section className="grid-template pb-24">
        <h2 className="display-md col-main mb-10" data-reveal>Intelligence in Every Layer.</h2>
        <ul className="col-main border-t border-line-strong">
          {CAPABILITIES.map(([t, d], i) => (
            <li key={t} className="grid gap-x-6 gap-y-1 border-b border-line-strong py-5 md:grid-cols-[4rem_1.2fr_1.6fr]" data-reveal>
              <span className="text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="title-sm">{t}</span>
              <span className="text-muted">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Stories: one large and two small chamfered cards */}
      {big && (
        <section className="grid-template pb-24">
          <div className="col-main flex flex-wrap items-end justify-between gap-6 border-b border-line-strong pb-4">
            <h2 className="display-md">A selection of our stories</h2>
            <nav aria-label="Story categories" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/media" className="line-link">All stories<sup className="ml-0.5">{stories.length}</sup></Link>
              {Object.entries(counts).map(([c, n]) => <Link key={c} href={`/media?c=${encodeURIComponent(c)}`} className="line-link text-muted">{c}<sup className="ml-0.5">{n}</sup></Link>)}
            </nav>
          </div>
          <div className="col-main mt-8 grid gap-x-3 gap-y-10 md:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
            {small.slice(0, 2).map((s) => (
              <article key={s.id} className="self-end">
                <div data-image-reveal className="overflow-hidden"><LiteYouTube id={s.vid!} title={s.title} /></div>
                <p className="mt-3 font-medium">{s.title}</p>
                <p className="text-xs text-muted">{s.cat}</p>
              </article>
            ))}
            <article className="md:col-span-2 lg:col-span-1">
              <div data-image-reveal className="chamfer-br overflow-hidden"><LiteYouTube id={big.vid!} title={big.title} thumbnail={big.vid === "QW3TEZJYb0c" ? "/images/gcc-lending-webinar.jpg" : undefined} /></div>
              <p className="mt-3 font-medium">{big.title}</p>
              <p className="text-xs text-muted">{big.cat}</p>
            </article>
          </div>
        </section>
      )}

      {/* 6. Trust + collective learning */}
      <section className="bg-bg">
        <div className="grid-template py-24">
          <div className="col-main grid gap-12 lg:grid-cols-2">
            <div data-reveal>
              <p className="eyebrow text-brand-ink">Trust by design</p>
              <h2 className="display-md mt-3">Innovation Without Compromising Trust.</h2>
              <p className="mt-4 max-w-md text-muted">Enterprise AI must be as accountable as it is intelligent.</p>
            </div>
            <ul className="border-t border-line-strong">
              {TRUST.map((t, i) => (
                <li key={t} className="flex items-baseline gap-6 border-b border-line-strong py-4" data-reveal>
                  <span className="text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span><span className="title-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-main mt-24 grid gap-12 lg:grid-cols-2">
            <div data-reveal>
              <p className="eyebrow text-brand-ink">Collective learning</p>
              <h2 className="display-md mt-3">Learning Together, Governed.</h2>
            </div>
            <ol className="border-t border-line-strong">
              {LEARNING.map(([t, d], i) => (
                <li key={t} className="grid gap-1 border-b border-line-strong py-5 sm:grid-cols-[3rem_1fr]" data-reveal>
                  <span className="text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span><span className="title-sm block">{t}</span><span className="mt-1 block text-muted">{d}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 7. Latest insights (lpas updates list) */}
      {!!insights.length && (
        <section className="grid-template py-24">
          <div className="col-main mb-8 flex items-end justify-between gap-4">
            <h2 className="display-md">Latest insights</h2>
            <Link href="/insights" className="line-link text-sm">All insights <ArrowUpRight size={14} aria-hidden /></Link>
          </div>
          <div className="col-main">
            <HoverList rows={insights.map((a) => ({
              href: "/insights", title: a.title, excerpt: a.body,
              meta: new Date(a.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).replaceAll("/", "."),
            }))} />
          </div>
        </section>
      )}

      <BuildCta />
    </>
  );
}
