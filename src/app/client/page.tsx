import Link from "next/link";
import { requireClientWorkspace } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Badge, ButtonLink, Card, Container, Empty, PageHeader, Stat, fmtDate, label } from "@/components/ui";

export default async function ClientDashboard() {
  const { viewer, org } = await requireClientWorkspace();
  const supabase = await createClient();
  const [{ data: ent }, { data: mine }, { data: content }, { data: ideas }] = await Promise.all([
    supabase.from("entitlements").select("offerings(slug, name, tagline)").eq("org_id", org.orgId),
    supabase.from("contributions").select("state").eq("author_id", viewer.id).eq("org_id", org.orgId),
    supabase.from("content_items").select("id, kind, title, body, starts_at").in("kind", ["session", "briefing", "release_note"]).neq("audience", "public").order("starts_at"),
    supabase.rpc("client_ideas"),
  ]);
  const offerings = (ent ?? []).map((e) => e.offerings as unknown as { slug: string; name: string; tagline: string });
  const count = (s: string) => mine?.filter((m) => m.state === s).length ?? 0;
  const isAdmin = org.roles.includes("client_admin");

  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Client workspace" title={org.orgName}
        actions={<><ButtonLink href="/client/observations/new">New contribution</ButtonLink><ButtonLink href="/client/resources" variant="outline">Resources</ButtonLink><ButtonLink href="/client/support" variant="outline">Support</ButtonLink>{isAdmin && <ButtonLink href="/client/members" variant="outline">Members</ButtonLink>}</>}>
        Signed in as {viewer.name} · {org.roles.map(label).join(", ")}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Drafts" value={count("draft")} />
        <Stat label="Awaiting review" value={count("submitted") + count("returned")} hint={count("returned") ? `${count("returned")} need clarification` : undefined} />
        <Stat label="Published" value={count("published")} />
        <Stat label="Entitled offerings" value={offerings.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Your offerings</h2>
          {!offerings.length ? <Empty title="No offerings are enabled for your organisation yet">Your Azentio contact can enable product entitlements.</Empty> : (
            <div className="grid gap-3">
              {offerings.map((o) => (
                <Card key={o.slug} className="flex items-center justify-between gap-3">
                  <div><p className="font-medium">{o.name}</p><p className="text-sm text-muted">{o.tagline}</p></div>
                  <ButtonLink href="/client/sandbox" variant="outline">Sandbox</ButtonLink>
                </Card>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Sessions, briefings & release notes</h2>
          {!content?.length ? <Empty title="Nothing scheduled for you" /> : (
            <div className="grid gap-3">
              {content.map((c) => (
                <Card key={c.id}>
                  <div className="flex justify-between gap-2"><p className="font-medium">{c.title}</p><Badge>{label(c.kind)}</Badge></div>
                  <p className="text-sm text-muted">{c.body}</p>
                  {c.starts_at && <p className="mt-1 text-xs">{fmtDate(c.starts_at)}</p>}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Improvement ideas from collective learning</h2>
        {!ideas?.length ? <Empty title="No improvement updates yet" /> : (
          <div className="grid gap-3">
            {(ideas as { id: string; title: string; owner_team: string; status: string; public_update: string; updated_at: string }[]).map((i) => (
              <Card key={i.id}>
                <div className="flex justify-between gap-2"><p className="font-medium">{i.title}</p><Badge tone="warn">{label(i.status)}</Badge></div>
                <p className="mt-1 text-sm">{i.public_update}</p>
                <p className="mt-1 text-xs text-muted">{i.owner_team} · updated {fmtDate(i.updated_at)}</p>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-3 text-sm"><Link href="/learning" className="underline">Browse the shared learning feed</Link></p>
      </section>
    </Container>
  );
}
