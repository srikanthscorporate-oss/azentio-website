// Product-strip photography (Unsplash licence, free for commercial use), graded into the azentio navy/green palette.
const PHOTOS: Record<string, { src: string; alt: string }> = {
  "credit-strategy-simulator": { src: "credit-strategy-simulator", alt: "Analytics dashboard comparing scenarios" },
  "sme-credit-decisioning": { src: "sme-credit-decisioning", alt: "Two colleagues reviewing a business case" },
  "similar-portfolio-intelligence": { src: "similar-portfolio-intelligence", alt: "Portfolio KPIs on a monitor" },
  riva: { src: "riva", alt: "Data centre cabling" },
  "rejection-intelligence": { src: "rejection-intelligence", alt: "Analysts investigating data on screens" },
  "financial-analysis-intelligence": { src: "financial-analysis-intelligence", alt: "Financial statements and a calculator" },
  "document-intelligence": { src: "document-intelligence", alt: "Stacked financial documents" },
  "persona-newsroom": { src: "persona-newsroom", alt: "Team presenting in a newsroom-style office" },
};

export function ProductMock({ slug }: { slug: string }) {
  const p = PHOTOS[slug] ?? PHOTOS["persona-newsroom"];
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/products/${p.src}.jpg`} alt={p.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[35%]" />
      <div aria-hidden className="absolute inset-0 bg-navy-deep/45 mix-blend-multiply" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-navy-deep/85 via-navy/25 to-[#214c52]/40" />
      <p className="absolute bottom-4 left-5 text-[10px] text-white/45">Photo: Unsplash</p>
    </>
  );
}
