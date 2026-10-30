import { notFound } from "next/navigation";
import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { moderate } from "@/app/actions/moderation";
import { Badge, Button, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

const half = (d: string) => { const x = new Date(d); return `${x.getMonth() < 6 ? "H1" : "H2"} ${x.getFullYear()}`; };

export default async function Review({ params, searchParams }: PageProps<"/moderation/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  await requirePlatformRole("moderator");
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("*, offerings(name)").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: notes }, { data: events }, { data: similar }] = await Promise.all([
    supabase.from("moderation_notes").select("note, created_at").eq("contribution_id", id).order("created_at"),
    supabase.from("moderation_events").select("action, public_reason, version, created_at").eq("contribution_id", id).order("created_at"),
    supabase.rpc("similar_shared", { p_text: `${c.title} ${c.body}` }),
  ]);
  const dupes = ((similar ?? []) as { id: string; title: string; score: number }[]).filter((x) => x.score > 0.15);
  const pending = c.state === "submitted";

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={`Review · ${label(c.kind)} · v${c.version}`} title={c.title} actions={<Badge tone="warn">{label(c.state)}</Badge>} />
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <Card>
            <p className="mb-2 text-xs font-semibold uppercase text-muted">Private source (never published)</p>
            <p className="whitespace-pre-wrap">{c.body}</p>
            <p className="mt-3 text-sm text-muted">{c.industry} · {c.region} · {fmtDate(c.period_start)} to {fmtDate(c.period_end)} · {label(c.evidence_type)} · {label(c.confidence)}</p>
            <p className="mt-1 text-sm text-muted">Offering: {c.offerings?.name ?? "Not set"}</p>
          </Card>
          {c.sensitive_flags?.length > 0 && <Notice tone="danger">Automated scan flagged: {c.sensitive_flags.map(label).join(", ")}. Redact before publishing.</Notice>}
          {dupes.length > 0 && (
            <Card className="text-sm">
              <p className="font-semibold">Possible duplicates already published</p>
              {dupes.map((d) => <p key={d.id}><a href={`/learning/${d.id}`} className="underline">{d.title}</a> <span className="text-muted">({Math.round(d.score * 100)}% text similarity)</span></p>)}
            </Card>
          )}
          <Card className="text-sm">
            <p className="font-semibold">Consents</p>
            <p>Publish reviewed copy: <b>{c.consent_publish ? "yes" : "no"}</b> · Attribution: <b>{c.consent_attribution ? "yes" : "no"}</b> · Training: <b>{c.consent_training ? "yes" : "no"}</b></p>
          </Card>
          <Card className="text-sm">
            <p className="mb-2 font-semibold">History & internal notes</p>
            {events?.map((e, i) => <p key={i}>{label(e.action)} v{e.version}, {fmtDate(e.created_at)}{e.public_reason && `: ${e.public_reason}`}</p>)}
            {notes?.map((n, i) => <p key={i} className="text-muted">Note: {n.note}</p>)}
          </Card>
        </div>

        {pending && (
          <Card>
            <form action={moderate} className="grid gap-3">
              <input type="hidden" name="id" value={id} />
              <p className="font-semibold">Reviewed shared version</p>
              <p className="text-xs text-muted">Only these fields are published. Remove names, locations below region level, exact dates and unusual details.</p>
              <label className="label" htmlFor="title">Title</label><input id="title" name="title" defaultValue={c.title} className="input" />
              <label className="label" htmlFor="body">Body</label><textarea id="body" name="body" defaultValue={c.body} rows={7} className="input" />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label" htmlFor="industry">Industry</label><input id="industry" name="industry" defaultValue={c.industry ?? ""} className="input" /></div>
                <div><label className="label" htmlFor="region">Region (coarse)</label><input id="region" name="region" defaultValue="" placeholder={c.region ?? ""} required className="input" /></div>
                <div><label className="label" htmlFor="period_label">Period</label><input id="period_label" name="period_label" defaultValue={half(c.period_start)} className="input" /></div>
              </div>
              <label className="flex gap-2 text-sm"><input type="checkbox" name="include_attribution" disabled={!c.consent_attribution} /> Show organisation attribution {c.consent_attribution ? "(author consented)" : "(no consent)"}</label>
              <label className="label" htmlFor="public_reason">Message to contributor (required to return or reject)</label>
              <input id="public_reason" name="public_reason" className="input" />
              <label className="label" htmlFor="internal_note">Internal note (moderators only)</label>
              <input id="internal_note" name="internal_note" className="input" />
              <div className="flex flex-wrap gap-2">
                <Button name="action" value="publish">Publish reviewed version</Button>
                <Button name="action" value="return" variant="outline" formNoValidate>Request clarification</Button>
                <Button name="action" value="reject" variant="danger" formNoValidate>Reject</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </Container>
  );
}
