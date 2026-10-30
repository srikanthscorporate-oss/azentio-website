import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Container, Empty, PageHeader, fmtDate, label } from "@/components/ui";

// Client-specific resources: content scoped to this organisation, to its entitled products, or to all clients.
// Row-level security decides what each viewer can read; the page only groups it.
export default async function Resources() {
  const { org } = await requireClientWorkspace();
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select("id, kind, title, body, audience, starts_at, created_at, offerings(name)")
    .in("audience", ["client_org", "entitled", "client_all"]).order("created_at", { ascending: false });
  const groups = [
    ["For " + org.orgName, (data ?? []).filter((c) => c.audience === "client_org")],
    ["For your products", (data ?? []).filter((c) => c.audience === "entitled")],
    ["For all clients", (data ?? []).filter((c) => c.audience === "client_all")],
  ] as const;

  return (
    <Container className="pb-16">
      <PageHeader eyebrow={org.orgName} title="Resources">Briefings, release notes and sessions available to your organisation.</PageHeader>
      <div className="grid gap-10">
        {groups.map(([title, items]) => (
          <section key={title}>
            <h2 className="title-sm mb-3">{title}</h2>
            {!items.length ? <Empty title="Nothing here yet" /> : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((c) => (
                  <Card key={c.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{c.title}</p><Badge>{label(c.kind)}</Badge></div>
                    <p className="mt-1 text-sm text-muted">{c.body}</p>
                    <p className="mt-2 text-xs text-muted">{(c.offerings as unknown as { name: string } | null)?.name ?? "General"}{c.starts_at && ` · ${fmtDate(c.starts_at)}`}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </Container>
  );
}
