import Link from "next/link";
import { hasPlatformRole, requirePlatformRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Badge, ButtonLink, Card, Container, Empty, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Ideas() {
  const v = await requirePlatformRole("employee");
  const supabase = await createClient();
  const { data } = await supabase.from("improvement_ideas").select("id, title, status, priority, owner_team, updated_at, offerings(name)").order("updated_at", { ascending: false });
  const po = hasPlatformRole(v, "product_owner");
  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Improvement loop" title="Improvement ideas"
        actions={po && <><ButtonLink href="/employee/themes" variant="outline">New theme</ButtonLink><ButtonLink href="/employee/ideas/new">New idea</ButtonLink></>}>
        Ideas link approved shared evidence to product decisions. Status is not a delivery commitment.
      </PageHeader>
      {!data?.length ? <Empty title="No ideas yet" /> : (
        <div className="grid gap-2">
          {data.map((i) => (
            <Link key={i.id} href={`/employee/ideas/${i.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-brand">
                <div><p className="font-medium">{i.title}</p><p className="text-xs text-muted">{(i.offerings as unknown as { name: string } | null)?.name} · {i.owner_team} · {fmtDate(i.updated_at)}</p></div>
                <div className="flex gap-2"><Badge>{i.priority} priority</Badge><Badge tone="warn">{label(i.status)}</Badge></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
