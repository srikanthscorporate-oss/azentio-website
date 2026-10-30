import { notFound } from "next/navigation";
import { requireParticipant } from "@/lib/participant";
import { createClient } from "@/lib/supabase/server";
import { reportShared } from "@/app/actions/learning";
import { addComment, deleteComment, flagComment, toggleBookmark } from "@/app/actions/collab";
import { Bookmark } from "lucide-react";
import { Badge, Button, Card, Container, Notice, PageHeader, fmtDate, label } from "@/components/ui";

export default async function SharedItem({ params, searchParams }: PageProps<"/learning/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const viewer = await requireParticipant();
  const supabase = await createClient();
  const { data: c } = await supabase.from("shared_contributions").select("*, offerings(name)").eq("id", id).eq("status", "published").maybeSingle();
  if (!c) notFound();
  const [{ data: myReports }, { data: bm }, { data: comments }] = await Promise.all([
    supabase.from("reports").select("id, status, decision").eq("shared_id", id),
    supabase.from("bookmarks").select("shared_id").eq("shared_id", id).eq("user_id", viewer.id),
    supabase.from("comments").select("id, body, author_kind, author_id, status, created_at").eq("shared_id", id).order("created_at"),
  ]);
  const saved = !!bm?.length;

  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader eyebrow={label(c.kind)} title={c.title} actions={
        <form action={toggleBookmark}><input type="hidden" name="shared_id" value={id} /><input type="hidden" name="on" value={saved ? "0" : "1"} />
          <Button variant="outline"><Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Bookmarked" : "Bookmark"}</Button></form>} />
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
        <p className="font-semibold">Discussion</p>
        <p className="text-sm text-muted">Comments are visible only to people who can see this contribution. Don't name customers or other organisations.</p>
        <div className="mt-4 grid gap-3">
          {comments?.map((m) => (
            <div key={m.id} className="rounded-xl border border-line p-3 text-sm">
              <div className="flex justify-between gap-2 text-xs text-muted">
                <span>{m.author_kind === "azentio" ? "Azentio team" : "Participant"}{m.author_id === viewer.id && " (you)"}{m.status !== "visible" && ` · ${m.status}`}</span>
                <span>{fmtDate(m.created_at)}</span>
              </div>
              <p className="mt-1">{m.body}</p>
              <div className="mt-2 flex gap-3 text-xs">
                {m.author_id === viewer.id
                  ? <form action={deleteComment}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="shared_id" value={id} /><button className="text-muted underline">Delete</button></form>
                  : m.status === "visible" && <form action={flagComment}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="shared_id" value={id} /><button className="text-muted underline">Flag for review</button></form>}
              </div>
            </div>
          ))}
          {!comments?.length && <p className="text-sm text-muted">No comments yet.</p>}
        </div>
        <form action={addComment} className="mt-4 grid gap-2">
          <input type="hidden" name="shared_id" value={id} />
          <textarea name="body" rows={2} minLength={2} maxLength={1000} required placeholder="Add to the discussion" className="input" />
          <div><Button variant="outline">Comment</Button></div>
        </form>
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
