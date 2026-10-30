import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPlatformRole, requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { updateIdeaStatus } from "@/app/actions/ideas";
import { Badge, Button, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

const STATUSES = ["proposed", "under_review", "planned", "in_progress", "released", "not_proceeding"];

export default async function Idea({ params, searchParams }: PageProps<"/employee/ideas/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const v = await requirePlatformRole("employee");
  const supabase = await createClient();
  const { data: i } = await supabase.from("improvement_ideas").select("*, offerings(name), themes(id, title)").eq("id", id).maybeSingle();
  if (!i) notFound();
  const [{ data: ev }, { data: hist }] = await Promise.all([
    supabase.from("idea_evidence").select("shared_contributions(id, title, status, region, period_label)").eq("idea_id", id),
    supabase.from("idea_status_history").select("from_status, to_status, note, created_at").eq("idea_id", id).order("created_at"),
  ]);
  const po = hasPlatformRole(v, "product_owner");

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={i.offerings?.name ?? "Improvement idea"} title={i.title} actions={<Badge tone="warn">{label(i.status)}</Badge>} />
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid content-start gap-4">
          <Card><p className="text-xs font-semibold uppercase text-muted">Problem (internal)</p><p className="mt-1">{i.problem}</p>
            <p className="mt-4 text-xs font-semibold uppercase text-muted">Proposed outcome (internal)</p><p className="mt-1">{i.proposed_outcome}</p>
            <p className="mt-4 text-sm text-muted">{i.owner_team} · {i.priority} priority · updated {fmtDate(i.updated_at)}{i.themes && <> · theme <Link className="underline" href={`/learning/themes/${i.themes.id}`}>{i.themes.title}</Link></>}</p></Card>
          <Card>
            <p className="mb-2 font-semibold">Supporting evidence</p>
            {ev?.map((e) => { const s = e.shared_contributions as unknown as { id: string; title: string; status: string; region: string; period_label: string };
              return <p key={s.id} className="text-sm">{s.status === "published" ? <Link href={`/learning/${s.id}`} className="underline">{s.title}</Link> : <span className="text-muted line-through">{s.title}</span>} <span className="text-muted">({s.status === "published" ? `${s.region}, ${s.period_label}` : s.status})</span></p>; })}
          </Card>
          <Card>
            <p className="mb-2 font-semibold">Audited status history</p>
            {hist?.map((h, k) => <p key={k} className="text-sm">{h.from_status ? label(h.from_status) : "Start"} to <b>{label(h.to_status)}</b> · {fmtDate(h.created_at)}{h.note && <span className="text-muted">: {h.note}</span>}</p>)}
          </Card>
        </div>
        <Card className="content-start">
          <p className="font-semibold">Client-visible update</p>
          <p className="mt-1 text-sm">{i.public_update ?? "None yet"}</p>
          <p className="mt-1 text-xs text-muted">{i.visible_to_clients ? "Visible to participants" : "Not visible to clients"}</p>
          {po && (
            <form action={updateIdeaStatus} className="mt-4 grid gap-2">
              <input type="hidden" name="id" value={id} />
              <select name="status" defaultValue={i.status} className="input">{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
              <input name="note" placeholder="Internal note" className="input" />
              <textarea name="public_update" rows={3} placeholder="Plain-language update for clients (no private sources, roadmaps or commitments)" className="input" />
              <label className="flex gap-2 text-sm"><input type="checkbox" name="visible_to_clients" defaultChecked={i.visible_to_clients} /> Show to participants</label>
              <Button>Update status</Button>
            </form>
          )}
        </Card>
      </div>
    </Container>
  );
}
