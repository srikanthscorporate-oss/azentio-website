import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Container, PageHeader } from "@/components/ui";

export const metadata = { title: "Products" };

export default async function Products() {
  const supabase = await createClient();
  const { data } = await supabase.from("offerings").select("slug, name, category, tagline, description").eq("is_public", true).order("name");
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Products" title="AI products for financial services">Explainable, configurable and built for human oversight.</PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((o) => (
          <Link key={o.slug} href={`/products/${o.slug}`}>
            <Card className="h-full hover:border-brand">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">{o.category}</p>
              <p className="mt-2 text-xl font-semibold">{o.name}</p>
              <p className="mt-2 text-sm text-muted">{o.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
}
