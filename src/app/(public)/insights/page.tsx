import { createClient } from "@/lib/supabase/server";
import { Card, Container, Empty, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Insights" };

export default async function Insights() {
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select("id, title, body, created_at").eq("kind", "insight").eq("audience", "public").order("created_at", { ascending: false });
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Explore" title="Insights" />
      {!data?.length ? <Empty title="No insights yet" /> : (
        <div className="grid gap-4">
          {data.map((i) => (
            <Card key={i.id}>
              <p className="text-xs text-muted">{fmtDate(i.created_at)}</p>
              <p className="mt-1 text-lg font-semibold">{i.title}</p>
              <p className="mt-1 text-muted">{i.body}</p>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
