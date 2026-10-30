import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Container, Empty, PageHeader, fmtDate } from "@/components/ui";

async function markAllRead() {
  "use server";
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}

export default async function Notifications() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  return (
    <Container className="max-w-3xl pb-16">
      <PageHeader title="Notifications" actions={<form action={markAllRead}><Button variant="outline">Mark all read</Button></form>}>
        In-app notifications. Email copies are queued separately and are not shown as delivered unless the provider confirms.
      </PageHeader>
      {!data?.length ? <Empty title="No notifications" /> : (
        <div className="grid gap-3">
          {data.map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : "border-brand"}>
              <div className="flex justify-between gap-4">
                <p className="font-semibold">{n.title}</p>
                <span className="text-xs text-muted">{fmtDate(n.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
              {n.link && <Link href={n.link} className="mt-2 inline-block text-sm text-brand-ink underline">Open</Link>}
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
