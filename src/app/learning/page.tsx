import Link from "next/link";
import { requireParticipant } from "@/lib/participant";
import { createClient } from "@/lib/supabase/server";
import { KINDS } from "@/lib/learning";
import { Badge, Button, Card, Container, Empty, PageHeader, label } from "@/components/ui";
import { Aira } from "./aira";

export const metadata = { title: "Learning hub" };

export default async function Learning({ searchParams }: PageProps<"/learning">) {
  await requireParticipant();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const supabase = await createClient();

  // Same RLS-scoped query backs the list and the count, so counts never exceed what the viewer may see.
  let q = supabase.from("shared_contributions").select("id, kind, title, body, industry, region, period_label, confidence, attribution, offerings(name)", { count: "exact" })
    .eq("status", "published").order("published_at", { ascending: false });
  if (s("q")) q = q.textSearch("search", s("q"), { type: "websearch" });
  if (s("offering")) q = q.eq("offering_id", s("offering"));
  if (s("kind")) q = q.eq("kind", s("kind"));
  if (s("region")) q = q.ilike("region", `%${s("region")}%`);
  if (s("industry")) q = q.ilike("industry", `%${s("industry")}%`);
  if (s("period")) q = q.ilike("period_label", `%${s("period")}%`);
  const [{ data, count }, { data: offerings }, { data: themes }] = await Promise.all([
    q, supabase.from("offerings").select("id, name").order("name"), supabase.from("themes").select("id, title, summary").order("updated_at", { ascending: false }),
  ]);

  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Collective learning" title="Shared learning feed">
        Reviewed, de-identified contributions from participating organisations. Separate from your organisation's private space.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <form className="mb-4 grid gap-2 md:grid-cols-3">
            <input name="q" defaultValue={s("q")} placeholder="Search" className="input md:col-span-3" />
            <select name="offering" defaultValue={s("offering")} className="input"><option value="">All offerings</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <select name="kind" defaultValue={s("kind")} className="input"><option value="">All topics</option>{KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
            <input name="industry" defaultValue={s("industry")} placeholder="Industry" className="input" />
            <input name="region" defaultValue={s("region")} placeholder="Region" className="input" />
            <input name="period" defaultValue={s("period")} placeholder="Period (e.g. 2026)" className="input" />
            <Button variant="outline">Filter</Button>
          </form>
          <p className="mb-3 text-sm text-muted">{count ?? 0} result(s)</p>
          {!data?.length ? <Empty title="No shared contributions match" /> : (
            <div className="grid gap-3">
              {data.map((c) => (
                <Link key={c.id} href={`/learning/${c.id}`}>
                  <Card className="hover:border-brand">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="brand">{label(c.kind)}</Badge>
                      {c.offerings && <Badge>{(c.offerings as unknown as { name: string }).name}</Badge>}
                      <Badge>{label(c.confidence)} confidence</Badge>
                    </div>
                    <p className="mt-2 font-medium">{c.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{c.body}</p>
                    <p className="mt-2 text-xs text-muted">{[c.industry, c.region, c.period_label].filter(Boolean).join(" · ")}{c.attribution && ` · ${c.attribution}`}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <aside className="grid content-start gap-4">
          <Aira />
          <Card>
            <p className="mb-2 font-semibold">Themes</p>
            {!themes?.length && <p className="text-sm text-muted">No themes yet.</p>}
            {themes?.map((t) => (
              <Link key={t.id} href={`/learning/themes/${t.id}`} className="block border-t border-line py-2 first:border-0">
                <p className="font-medium">{t.title}</p><p className="line-clamp-2 text-xs text-muted">{t.summary}</p>
              </Link>
            ))}
          </Card>
        </aside>
      </div>
    </Container>
  );
}
