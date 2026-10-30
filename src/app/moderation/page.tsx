import Link from "next/link";
import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/app/actions/moderation";
import { moderateComment } from "@/app/actions/collab";
import { Badge, Button, Card, Container, Empty, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Moderation({ searchParams }: PageProps<"/moderation">) {
  const { error } = await searchParams;
  await requirePlatformRole("moderator");
  const supabase = await createClient();
  const [{ data: queue }, { data: reports }, { data: flagged }] = await Promise.all([
    supabase.from("contributions").select("id, title, kind, version, sensitive_flags, updated_at").eq("state", "submitted").eq("visibility", "proposed_shared").order("updated_at"),
    supabase.from("reports").select("id, reason, details, status, decision, created_at, shared_contributions(id, title, status)").eq("status", "open").order("created_at"),
    supabase.from("comments").select("id, body, shared_id, created_at, shared_contributions(title)").eq("status", "flagged").order("created_at"),
  ]);
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Learning moderation" title="Review queue">
        Only contributions proposed for sharing and submitted appear here. Drafts and organisation-only content are never visible to moderators.
      </PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      {!queue?.length ? <Empty title="Queue is empty" /> : (
        <div className="grid gap-2">
          {queue.map((c) => (
            <Link key={c.id} href={`/moderation/${c.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-brand">
                <div><p className="font-medium">{c.title}</p><p className="text-xs text-muted">{label(c.kind)} · v{c.version} · {fmtDate(c.updated_at)}</p></div>
                {c.sensitive_flags?.length > 0 && <Badge tone="danger">{c.sensitive_flags.length} sensitivity flag(s)</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-xl font-semibold">Open reports</h2>
      {!reports?.length ? <Empty title="No open reports" /> : (
        <div className="grid gap-3">
          {reports.map((r) => {
            const s = r.shared_contributions as unknown as { id: string; title: string; status: string };
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{s.title}</p>
                  <div className="flex gap-2"><Badge tone="danger">{label(r.reason)}</Badge><Badge>{s.status}</Badge></div>
                </div>
                {r.details && <p className="mt-1 text-sm text-muted">{r.details}</p>}
                {r.decision && <p className="mt-1 text-xs">Last decision: {r.decision}</p>}
                <form action={resolveReport} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="reason" placeholder="Reason shown to contributor" className="input max-w-sm" />
                  {s.status === "published" && <Button name="decision" value="unpublish" variant="outline">Temporarily unpublish</Button>}
                  {s.status === "unpublished" && <Button name="decision" value="restore" variant="outline">Restore</Button>}
                  <Button name="decision" value="remove" variant="danger">Remove</Button>
                  <Button name="decision" value="dismiss" variant="outline">Dismiss</Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-xl font-semibold">Flagged comments</h2>
      {!flagged?.length ? <Empty title="No flagged comments" /> : (
        <div className="grid gap-3">
          {flagged.map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-muted">On: {(m.shared_contributions as unknown as { title: string }).title}</p><p className="mt-1">{m.body}</p></div>
              <div className="flex gap-2">
                <form action={moderateComment}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="visible" /><Button variant="outline">Keep</Button></form>
                <form action={moderateComment}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="hidden" /><Button variant="danger">Hide</Button></form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
