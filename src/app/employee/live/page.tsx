import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Card, Container, Empty, PageHeader } from "@/components/ui";

export default async function Live() {
  await requirePlatformRole("employee");
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select("id, title, body, external_url, media_path").eq("kind", "broadcast").eq("audience", "employee");
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Employee" title="Live sessions & recordings">Restricted to employees. Only publishers can configure sessions.</PageHeader>
      {!data?.length ? <Empty title="No broadcasts" /> : (
        <div className="grid gap-6 md:grid-cols-2">
          {data.map((b) => (
            <Card key={b.id}>
              {b.media_path ? <video controls src={`/api/media/${b.id}`} className="w-full rounded-lg" /> :
                b.external_url && <iframe src={b.external_url} title={b.title} className="aspect-video w-full rounded-lg" allowFullScreen />}
              <p className="mt-3 font-semibold">{b.title}</p><p className="text-sm text-muted">{b.body}</p>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
