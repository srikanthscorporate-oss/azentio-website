import Link from "next/link";
import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { STATE_TONE, VISIBILITY_COPY } from "@/lib/learning";
import { Badge, ButtonLink, Card, Container, Empty, PageHeader, fmtDate, label } from "@/components/ui";

export default async function Observations({ searchParams }: PageProps<"/client/observations">) {
  const { tab } = await searchParams;
  const { viewer, org } = await requireClientWorkspace();
  const supabase = await createClient();
  const orgTab = tab === "org";
  let q = supabase.from("contributions").select("id, title, kind, state, visibility, version, updated_at, author_id").eq("org_id", org.orgId).order("updated_at", { ascending: false });
  q = orgTab ? q.eq("visibility", "organisation").eq("state", "published") : q.eq("author_id", viewer.id);
  const { data } = await q;

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={org.orgName} title="Observations" actions={<ButtonLink href="/client/observations/new">New contribution</ButtonLink>}>
        Your organisation's private space. The cross-client shared feed lives in the <Link href="/learning" className="underline">Learning hub</Link>.
      </PageHeader>
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/client/observations" className={`rounded-full px-3 py-1 ${!orgTab ? "bg-navy text-white" : "border border-line"}`}>My observations</Link>
        <Link href="/client/observations?tab=org" className={`rounded-full px-3 py-1 ${orgTab ? "bg-navy text-white" : "border border-line"}`}>Our organisation's observations</Link>
      </div>
      {!data?.length ? <Empty title={orgTab ? "Nothing shared within your organisation yet" : "You haven't written anything yet"} /> : (
        <div className="grid gap-3">
          {data.map((c) => (
            <Link key={c.id} href={`/client/observations/${c.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-brand">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted">{label(c.kind)} · v{c.version} · updated {fmtDate(c.updated_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge>{VISIBILITY_COPY[c.visibility as keyof typeof VISIBILITY_COPY].title}</Badge>
                  <Badge tone={STATE_TONE[c.state]}>{label(c.state)}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
