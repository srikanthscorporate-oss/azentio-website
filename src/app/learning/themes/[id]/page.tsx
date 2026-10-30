import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParticipant } from "@/lib/participant";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Container, Notice, PageHeader, Stat, fmtDate, label } from "@/components/ui";

export default async function Theme({ params }: PageProps<"/learning/themes/[id]">) {
  const { id } = await params;
  await requireParticipant();
  const supabase = await createClient();
  const { data: t } = await supabase.from("themes").select("*, offerings(name)").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [{ data: stats }, { data: links }, { data: ideas }] = await Promise.all([
    supabase.rpc("theme_stats", { p_theme: id }),
    supabase.from("theme_links").select("shared_contributions(id, title, region, period_label, confidence, status, published_at)").eq("theme_id", id),
    supabase.rpc("client_ideas"),
  ]);
  const st = stats?.[0] as { contribution_count: number | null; org_count: number | null; suppressed: boolean } | undefined;
  const evidence = (links ?? []).map((l) => l.shared_contributions as unknown as { id: string; title: string; region: string; period_label: string; confidence: string; status: string; published_at: string }).filter((e) => e?.status === "published");
  const related = (ideas as { id: string; title: string; status: string; public_update: string; owner_team: string; updated_at: string; theme_id: string }[] | null)?.filter((i) => i.theme_id === id) ?? [];

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={`Theme · ${t.offerings?.name ?? "Cross-offering"}`} title={t.title}>{t.summary}</PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Distinct contributing organisations" value={st?.suppressed ? "Suppressed" : st?.org_count} hint={st?.suppressed ? "Below the minimum cohort size" : "Repeat posts from one organisation count once"} />
        <Stat label="Supporting contributions" value={st?.suppressed ? "Hidden" : st?.contribution_count} />
        <Stat label="Last updated" value={fmtDate(t.updated_at)} />
      </div>
      <div className="mt-4"><Notice tone="warn"><b>Limitations:</b> {t.limitations}</Notice></div>
      <TrendSummary dates={evidence.map((e) => e.published_at)} suppressed={!!st?.suppressed} />

      <h2 className="mb-3 mt-8 font-semibold">Supporting evidence</h2>
      <div className="grid gap-2">
        {evidence.map((e) => (
          <Link key={e.id} href={`/learning/${e.id}`}><Card className="hover:border-brand"><p className="font-medium">{e.title}</p><p className="text-xs text-muted">{e.region} · {e.period_label} · {label(e.confidence)} confidence</p></Card></Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Improvement status</h2>
      {!related.length ? <p className="text-sm text-muted">No improvement idea linked yet.</p> : related.map((i) => (
        <Card key={i.id}>
          <div className="flex justify-between"><p className="font-medium">{i.title}</p><Badge tone="warn">{label(i.status)}</Badge></div>
          <p className="mt-1 text-sm">{i.public_update}</p>
          <p className="mt-1 text-xs text-muted">{i.owner_team} · updated {fmtDate(i.updated_at)}</p>
        </Card>
      ))}
    </Container>
  );
}

// Trend-change summary: recent versus earlier supporting contributions. Hidden when the theme is below the minimum cohort.
function trendText(dates: string[]) {
  const cutoff = Date.now() - 30 * 86400000;
  const recent = dates.filter((d) => new Date(d).getTime() >= cutoff).length;
  const earlier = dates.length - recent;
  if (recent === 0) return "No new supporting contributions in the last 30 days.";
  if (earlier === 0) return `All ${recent} supporting contributions were published in the last 30 days. This is a new theme.`;
  return `${recent} new supporting contribution${recent > 1 ? "s" : ""} in the last 30 days, after ${earlier} earlier.`;
}

function TrendSummary({ dates, suppressed }: { dates: string[]; suppressed: boolean }) {
  if (suppressed) return <p className="mt-4 text-sm text-muted">Trend hidden: this theme is below the minimum number of contributing organisations.</p>;
  return <p className="mt-4 text-sm"><b>Trend:</b> {trendText(dates)} <span className="text-muted">Counts of contributions, not of market activity.</span></p>;
}
