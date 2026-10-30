import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card, Container, PageHeader } from "@/components/ui";

export default async function Product({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase.from("offerings").select("id, name, category, tagline, description").eq("slug", slug).eq("is_public", true).maybeSingle();
  if (!o) notFound();
  // RLS returns only content this visitor is allowed to see (public for anonymous visitors).
  const { data: media } = await supabase.from("content_items").select("id, kind, title, body, external_url").eq("offering_id", o.id).order("created_at");
  return (
    <Container className="pb-16">
      <PageHeader eyebrow={o.category} title={o.name} actions={<ButtonLink href={`/connect?offering=${slug}`}>Request a demo</ButtonLink>}>
        {o.tagline}
      </PageHeader>
      <p className="max-w-3xl text-lg">{o.description}</p>
      {!!media?.length && (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {media.map((m) => (
            <Card key={m.id}>
              <p className="text-xs uppercase text-muted">{m.kind.replace("_", " ")}</p>
              <p className="mt-1 font-semibold">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.body}</p>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
