import { requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createContent, togglePublished } from "@/app/actions/publisher";
import { Badge, Button, Card, Container, Notice, PageHeader, label } from "@/components/ui";

export default async function Publisher({ searchParams }: PageProps<"/publisher">) {
  const { error } = await searchParams;
  await requirePlatformRole("publisher");
  const supabase = await createClient();
  const [{ data: items }, { data: offerings }] = await Promise.all([
    supabase.from("content_items").select("id, kind, title, audience, is_published, media_path").order("created_at", { ascending: false }),
    supabase.from("offerings").select("id, name"),
  ]);
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Content publisher" title="Website & media">Every item needs an explicit audience. Uploaded media is stored privately and served only after an access check.</PageHeader>
      {typeof error === "string" && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <form action={createContent} className="grid gap-2">
            <p className="font-semibold">New content</p>
            <select name="kind" className="input">{["banner", "insight", "video", "broadcast", "session", "release_note", "knowledge", "experiment", "briefing"].map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
            <input name="title" required placeholder="Title" className="input" />
            <textarea name="body" rows={3} placeholder="Body" className="input" />
            <select name="audience" required defaultValue="" className="input">
              <option value="" disabled>Audience (required)</option>
              <option value="public">Public</option><option value="employee">Employees only</option>
              <option value="client_all">All client participants</option><option value="entitled">Clients entitled to an offering</option>
            </select>
            <select name="offering_id" className="input"><option value="">Offering (required for entitled)</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <input name="external_url" placeholder="Embed URL (optional)" className="input" />
            <input type="file" name="file" accept="video/mp4,video/webm,image/png,image/jpeg,application/pdf" className="text-sm" />
            <label className="flex gap-2 text-sm"><input type="checkbox" name="publish" /> Publish now</label>
            <div><Button>Create</Button></div>
          </form>
        </Card>
        <div className="grid content-start gap-2">
          {items?.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-medium">{c.title}</p><p className="text-xs text-muted">{label(c.kind)}{c.media_path && " · private media"}</p></div>
              <div className="flex items-center gap-2">
                <Badge tone={c.audience === "public" ? "brand" : "navy"}>{label(c.audience)}</Badge>
                <form action={togglePublished}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="to" value={c.is_published ? "0" : "1"} />
                  <Button variant="outline">{c.is_published ? "Unpublish" : "Publish"}</Button></form>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
