// Stylised product-screen mockups for the product strip (like the reference prototype's product cards).
// Purely decorative: every value is illustrative.
const Bar = ({ h, hi }: { h: number; hi?: boolean }) => <div className={`w-full rounded-t ${hi ? "bg-brand" : "bg-white/25"}`} style={{ height: `${h}%` }} />;
const Row = ({ w, hi }: { w: number; hi?: boolean }) => <div className={`h-2 rounded ${hi ? "bg-brand" : "bg-white/20"}`} style={{ width: `${w}%` }} />;

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-[10%] bottom-[12%] top-[14%] flex flex-col rounded-xl border border-white/15 bg-navy-deep/70 p-5 shadow-[0_18px_50px_#00000055] backdrop-blur">
      <div className="mb-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-white/25" />)}
        <span className="ml-3 text-[11px] font-medium text-brand">{title}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function ProductMock({ slug }: { slug: string }) {
  switch (slug) {
    case "credit-strategy-simulator":
      return <Frame title="Compare policy scenarios"><div className="flex h-full items-end gap-2">{[40, 55, 48, 70, 62, 85, 58].map((h, i) => <Bar key={i} h={h} hi={i === 5} />)}</div></Frame>;
    case "sme-credit-decisioning":
      return <Frame title="Evidence-backed review"><div className="grid gap-3">{["Policy checks passed", "Exceptions flagged", "Recommendation ready"].map((t, i) => <div key={t} className="flex items-center gap-3 text-[11px] text-white/80"><span className={`h-3 w-3 rounded-full ${i === 1 ? "bg-white/30" : "bg-brand"}`} />{t}</div>)}<Row w={80} /><Row w={60} /></div></Frame>;
    case "similar-portfolio-intelligence":
      return <Frame title="Find the relevant cohort"><div className="relative h-full">{[[20, 60], [35, 40], [50, 55], [42, 30], [65, 45], [70, 25], [30, 75], [58, 68]].map(([x, y], i) => <span key={i} className={`absolute h-3 w-3 rounded-full ${i === 4 ? "bg-brand ring-4 ring-brand/30" : "bg-white/40"}`} style={{ left: `${x}%`, top: `${y}%` }} />)}</div></Frame>;
    case "riva":
      return <Frame title="Connect. Map. Validate."><div className="grid gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3"><Row w={90} /><Row w={70} /><span className={`h-2.5 w-8 rounded ${i === 3 ? "bg-white/30" : "bg-brand/80"}`} /></div>)}</div></Frame>;
    case "rejection-intelligence":
      return <Frame title="Rejection drivers"><div className="flex h-full items-center gap-6"><div className="h-24 w-24 shrink-0 rounded-full" style={{ background: "conic-gradient(#69d393 0 38%, #ffffff55 38% 64%, #ffffff33 64% 85%, #ffffff1f 85%)" }} /><div className="grid flex-1 gap-2"><Row w={90} hi /><Row w={65} /><Row w={50} /><Row w={30} /></div></div></Frame>;
    case "financial-analysis-intelligence":
      return <Frame title="Ratios and trends"><svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none" aria-hidden><polyline fill="none" stroke="#ffffff55" strokeWidth="2" points="0,60 30,52 60,58 90,40 120,46 150,30 200,34" /><polyline fill="none" stroke="#69d393" strokeWidth="3" points="0,70 30,62 60,50 90,55 120,32 150,26 200,12" /></svg></Frame>;
    case "document-intelligence":
      return <Frame title="Documents in, data out"><div className="grid h-full grid-cols-2 gap-4"><div className="grid content-start gap-2 rounded-md bg-white/10 p-3">{[90, 70, 85, 50, 75].map((w, i) => <Row key={i} w={w} />)}</div><div className="grid content-start gap-2">{["Name", "Period", "Revenue", "Status"].map((t, i) => <div key={t} className="flex items-center justify-between rounded bg-white/10 px-2 py-1 text-[10px] text-white/70">{t}<span className={`h-2 w-2 rounded-full ${i === 2 ? "bg-white/40" : "bg-brand"}`} /></div>)}</div></div></Frame>;
    default:
      return <Frame title="Persona drafts"><div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="flex gap-3 rounded-md bg-white/10 p-2.5"><span className={`h-8 w-8 shrink-0 rounded ${i === 0 ? "bg-brand" : "bg-white/25"}`} /><div className="grid flex-1 content-center gap-1.5"><Row w={85} /><Row w={55} /></div></div>)}</div></Frame>;
  }
}
