import { notFound } from "next/navigation";
import { requireParticipant } from "@/lib/participant";
import { createClient } from "@/lib/supabase/server";
import { reportShared } from "@/app/actions/learning";
import { Badge, Button, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function SharedItem({ params, searchParams }: PageProps<"/learning/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireParticipant();
  const supabase = await createClient();
  const { data: c } = await supabase.from("shared_contributions").select("*, offerings(name)").eq("id", id).eq("status", "published").maybeSingle();
  if (!c) notFound();
  const { data: myReports } = await supabase.from("reports").select("id, status, decision").eq("shared_id", id);

  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader eyebrow={label(c.kind)} title={c.title} />
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          {c.offerings && <Badge>{c.offerings.name}</Badge>}
          <Badge>{label(c.evidence_type)}</Badge><Badge>{label(c.confidence)} confidence</Badge><Badge>v{c.version}</Badge>
        </div>
        <p className="whitespace-pre-wrap">{c.body}</p>
        <p className="mt-4 text-sm text-muted">{[c.industry, c.region, c.period_label].filter(Boolean).join(" · ")} · published {fmtDate(c.published_at)}</p>
        <p className="mt-1 text-sm text-muted">{c.attribution ? `Shared by ${c.attribution} (with consent)` : "Contributor not identified"}</p>
      </Card>
      <Card className="mt-6">
        <p className="font-semibold">Report this contribution</p>
        <p className="text-sm text-muted">For misleading, confidential or inappropriate content. You don't need to name any other organisation.</p>
        {myReports?.length ? <p className="mt-3 text-sm">You reported this. Status: <Badge tone="warn">{myReports[0].status}</Badge></p> : (
          <form action={reportShared} className="mt-3 grid gap-2">
            <input type="hidden" name="id" value={id} />
            <select name="reason" className="input">{["misleading", "confidential", "inappropriate", "duplicate", "other"].map((r) => <option key={r} value={r}>{label(r)}</option>)}</select>
            <textarea name="details" maxLength={1000} rows={2} placeholder="Details (optional)" className="input" />
            <div><Button variant="danger">Report</Button></div>
          </form>
        )}
      </Card>
    </Container>
  );
}
