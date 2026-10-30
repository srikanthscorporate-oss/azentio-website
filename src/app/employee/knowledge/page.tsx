import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { rateContent } from "@/app/actions/collab";
import { Badge, Button, Card, Container, Empty, PageHeader, label } from "@/components/ui";

export default async function Knowledge() {
  const v = await requirePlatformRole("employee");
  const supabase = await createClient();
  const [{ data: items }, { data: mine }] = await Promise.all([
    supabase.from("content_items").select("id, kind, title, body, review_due, updated_at, profiles(full_name)").in("kind", ["knowledge", "release_note", "experiment"]).order("updated_at", { ascending: false }),
    supabase.from("content_feedback").select("content_id, rating").eq("user_id", v.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Employee" title="Knowledge library & release notes">Every item has an owner and a review date. Your ratings go to the owner.</PageHeader>
      {!items?.length ? <Empty title="Nothing in the library yet" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => {
            const rated = mine?.find((m) => m.content_id === c.id)?.rating;
            const overdue = c.review_due && c.review_due < today;
            return (
              <Card key={c.id}>
                <div className="flex justify-between gap-2"><p className="font-medium">{c.title}</p><Badge tone="navy">{label(c.kind)}</Badge></div>
                <p className="mt-1 text-sm text-muted">{c.body}</p>
                <p className="mt-2 text-xs text-muted">
                  Owner: {(c.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unassigned"} ·{" "}
                  {c.review_due ? <span className={overdue ? "text-danger" : ""}>Review {overdue ? "overdue since" : "due"} {c.review_due}</span> : "No review date"}
                </p>
                {rated ? <p className="mt-3 text-xs">Your rating: <Badge tone="brand">{rated}</Badge></p> : (
                  <form action={rateContent} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    {["useful", "unclear", "outdated"].map((r) => <Button key={r} name="rating" value={r} variant="outline">{label(r)}</Button>)}
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
