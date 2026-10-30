import { getPublicContent } from "@/lib/public-data";
import { Card, Container, Empty, PageHeader, fmtDate } from "@/components/ui";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export const metadata = { title: "Insights" };

export default async function Insights() {
  const data = await getPublicContent("insight");
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
