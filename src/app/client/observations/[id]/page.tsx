import { notFound } from "next/navigation";
import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { STATE_TONE, VISIBILITY_COPY } from "@/lib/learning";
import { deleteDraft, reviseContribution, submitContribution, withdrawContribution } from "@/app/actions/learning";
import { Badge, Button, ButtonLink, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Observation({ params, searchParams }: PageProps<"/client/observations/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const { viewer } = await requireClientWorkspace();
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("*, offerings(name)").eq("id", id).maybeSingle();
  if (!c) notFound();
  const mine = c.author_id === viewer.id;
  const [{ data: events }, { data: shared }, { data: consents }] = await Promise.all([
    supabase.from("moderation_events").select("action, public_reason, version, created_at").eq("contribution_id", id).order("created_at"),
    mine ? supabase.rpc("my_shared_copy", { p_contribution: id }) : Promise.resolve({ data: [] }),
    supabase.from("consent_history").select("consents, created_at").eq("contribution_id", id).order("created_at", { ascending: false }),
  ]);
  const copy = (shared as { title: string; body: string; region: string; period_label: string; status: string; version: number; attribution: string | null }[] | null)?.[0];
  const lastReturn = [...(events ?? [])].reverse().find((e) => e.action === "return");
  const vis = VISIBILITY_COPY[c.visibility as keyof typeof VISIBILITY_COPY];

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={`${label(c.kind)} · v${c.version}`} title={c.title}
        actions={<div className="flex gap-2"><Badge>{vis.title}</Badge><Badge tone={STATE_TONE[c.state]}>{label(c.state)}</Badge></div>} />
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      {c.state === "returned" && lastReturn && <div className="mb-4"><Notice tone="warn"><b>Moderator asked:</b> {lastReturn.public_reason}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <p className="whitespace-pre-wrap">{c.body}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted">
              <dt>Offering</dt><dd>{c.offerings?.name ?? "Not set"}</dd>
              <dt>Industry · Region</dt><dd>{c.industry ?? "Not set"} · {c.region ?? "Not set"}</dd>
              <dt>Period</dt><dd>{fmtDate(c.period_start)} to {fmtDate(c.period_end)}</dd>
              <dt>Evidence · Confidence</dt><dd>{label(c.evidence_type)} · {label(c.confidence)}</dd>
            </dl>
            {c.sensitive_flags?.length > 0 && <div className="mt-4"><Notice tone="warn">Flagged for moderator attention: {c.sensitive_flags.map(label).join(", ")}</Notice></div>}
          </Card>

          {copy && (
            <Card className="border-brand">
              <div className="flex justify-between"><p className="font-semibold">Shared (reviewed) version v{copy.version}</p><Badge tone={copy.status === "published" ? "brand" : "neutral"}>{label(copy.status)}</Badge></div>
              <p className="mt-1 text-xs text-muted">This is exactly what other organisations can see. Your original above stays private.</p>
              <p className="mt-3 font-medium">{copy.title}</p>
              <p className="mt-1 text-sm">{copy.body}</p>
              <p className="mt-2 text-xs text-muted">{copy.region} · {copy.period_label} · {copy.attribution ? `Attributed to ${copy.attribution}` : "Not attributed"}</p>
            </Card>
          )}

          <Card>
            <p className="mb-3 font-semibold">History</p>
            <ol className="grid gap-2 text-sm">
              {events?.map((e, i) => (
                <li key={i} className="flex justify-between gap-4"><span>{label(e.action)} (v{e.version}){e.public_reason && <span className="text-muted">: {e.public_reason}</span>}</span><span className="text-muted">{fmtDate(e.created_at)}</span></li>
              ))}
              {!events?.length && <li className="text-muted">Draft, not yet submitted.</li>}
            </ol>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <p className="font-semibold">Who can see this</p>
            <p className="mt-1 text-sm text-muted">{c.state === "draft" ? "Only you, while it is a draft." : vis.who}</p>
            <p className="mt-4 font-semibold">How it may be used</p>
            <ul className="mt-1 text-sm text-muted">
              <li>Process/store: {c.consent_process ? "yes" : "no"}</li>
              <li>Publish reviewed copy: {c.consent_publish ? "yes" : "no"}</li>
              <li>Attribution: {c.consent_attribution ? "yes, if approved" : "no"}</li>
              <li>Training programmes: {c.consent_training ? "yes (separate programme)" : "no"}</li>
            </ul>
            <p className="mt-2 text-xs text-muted">{consents?.length ?? 0} consent change(s) recorded.</p>
          </Card>
          {mine && (
            <Card className="grid gap-2">
              {["draft", "returned"].includes(c.state) && <ButtonLink href={`/client/observations/${id}/edit`} variant="outline">Edit</ButtonLink>}
              {["draft", "returned"].includes(c.state) && c.visibility !== "private" && (
                <form action={submitContribution}><input type="hidden" name="id" value={id} /><Button className="w-full">{c.visibility === "organisation" ? "Share with organisation" : "Submit for review"}</Button></form>
              )}
              {["published", "rejected"].includes(c.state) && (
                <form action={reviseContribution}><input type="hidden" name="id" value={id} /><Button variant="outline" className="w-full">Start a new version</Button></form>
              )}
              {c.state === "draft" && c.version === 1 && (
                <form action={deleteDraft}><input type="hidden" name="id" value={id} /><Button variant="danger" className="w-full">Delete draft</Button></form>
              )}
              {c.state !== "withdrawn" && c.state !== "draft" && (
                <form action={withdrawContribution}>
                  <input type="hidden" name="id" value={id} />
                  <Button variant="danger" className="w-full">Withdraw</Button>
                  <p className="mt-2 text-xs text-muted">Removes it from the shared feed, search and AIRA immediately. Copies already viewed cannot be recalled.</p>
                </form>
              )}
              {c.state === "draft" && copy?.status === "published" && (
                <form action={withdrawContribution}><input type="hidden" name="id" value={id} /><Button variant="danger" className="w-full">Withdraw shared version</Button></form>
              )}
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
