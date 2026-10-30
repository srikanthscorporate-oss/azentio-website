import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { getOffering, getOfferings } from "@/lib/public-data";
import { ButtonLink, Container, PageSkeleton, PageHeader } from "@/components/ui";
import { BuildCta, NumberedCards, SectionHead } from "@/components/sections";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export async function generateStaticParams() {
  return (await getOfferings()).map((o) => ({ slug: o.slug }));
}

export default function Product({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductBody params={params} />
    </Suspense>
  );
}

async function ProductBody({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const o = await getOffering(slug);
  if (!o) notFound();
  const features = o.features as string[];
  const steps = o.how_it_works as string[];
  const value = o.business_value as string[];

  return (
    <>
      <Container>
        <PageHeader eyebrow={o.category} title={o.headline ?? o.name}
          scope={<Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white"><ArrowLeft size={14} aria-hidden /> All products</Link>}
          actions={<><ButtonLink href={`/connect?offering=${slug}`}>Request a demo</ButtonLink><span className="self-center text-xs text-white/70">Development status: {o.dev_status}</span></>}>
          {o.description}
        </PageHeader>
      </Container>

      <Container className="pb-10">
        <SectionHead eyebrow="What we built" title={o.name} aside={o.tagline} />
        <NumberedCards items={features.map((f) => [f, "Designed to support transparent, configurable and practical workflows."] as const)} />
      </Container>

      {!!steps.length && (
        <section className="bg-bg">
          <Container className="py-20">
            <SectionHead eyebrow="How it works" title="From Input to Insight." />
            <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface p-4">
                  <span className="flex items-center gap-3"><span className="text-xs font-bold text-brand-ink">{String(i + 1).padStart(2, "0")}</span><span className="text-sm font-bold">{s}</span></span>
                  {i < steps.length - 1 && <ArrowRight size={14} className="hidden shrink-0 text-brand lg:block" aria-hidden />}
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      {!!value.length && (
        <Container className="py-20">
          <SectionHead eyebrow="Potential business value" title="Intelligence That Supports Action." />
          <ul className="mt-10 grid gap-3 md:grid-cols-3">
            {value.map((v) => <li key={v} className="flex items-center gap-3 rounded-[10px] bg-bg p-5 font-bold"><CircleCheck size={18} className="shrink-0 text-brand-ink" aria-hidden />{v}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted">Benefits describe intended outcomes, not verified performance claims.</p>
        </Container>
      )}

      <BuildCta title={`Explore ${o.name}`} text="See how this solution could fit your business processes and enterprise environment." />
    </>
  );
}
