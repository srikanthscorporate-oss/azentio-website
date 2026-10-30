import Link from "next/link";
import { getOfferings } from "@/lib/public-data";
import { Card, Container, PageHeader } from "@/components/ui";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export const metadata = { title: "Products" };

export default async function Products() {
  const data = await getOfferings();
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
