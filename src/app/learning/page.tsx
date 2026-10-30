import Link from "next/link";
import { requireParticipant } from "@/lib/participant";
import { createClient } from "@/lib/supabase/server";
import { KINDS } from "@/lib/learning";
import { Badge, Button, Card, Container, Empty, PageHeader, label } from "@/components/ui";
import { deleteSearch, saveSearch, setDigest } from "@/app/actions/collab";

export const metadata = { title: "Learning hub" };

export default async function Learning({ searchParams }: PageProps<"/learning">) {
  const viewer = await requireParticipant();
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
  if (s("saved")) {
    const { data: bm } = await supabase.from("bookmarks").select("shared_id").eq("user_id", viewer.id);
    q = q.in("id", bm?.length ? bm.map((b) => b.shared_id) : ["00000000-0000-0000-0000-000000000000"]);
  }
  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string" && v) as [string, string][]).toString();
  const [{ data, count }, { data: offerings }, { data: themes }] = await Promise.all([
    q, supabase.from("offerings").select("id, name").order("name"), supabase.from("themes").select("id, title, summary").order("updated_at", { ascending: false }),
  ]);
  const [{ data: searches }, { data: digest }] = await Promise.all([
    supabase.from("saved_searches").select("id, name, query").eq("user_id", viewer.id).order("created_at"),
    supabase.from("digest_subscriptions").select("offering_id").eq("user_id", viewer.id).maybeSingle(),
  ]);

  return (
    <Container className="pb-16">
      <PageHeader eyebrow="Collective learning" title="Shared learning feed">
        Reviewed, de-identified contributions from participating organisations. Separate from your organisation's private space.
      </PageHeader>

      <p className="mb-6 text-xs text-muted">Withdrawn contributions leave this feed, search and AIRA immediately. Copies already viewed cannot be recalled.</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <form className="mb-4 grid gap-2 md:grid-cols-3">
            <input name="q" defaultValue={s("q")} placeholder="Search" className="input md:col-span-3" />
            <select name="offering" defaultValue={s("offering")} className="input"><option value="">All offerings</option>{offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <select name="kind" defaultValue={s("kind")} className="input"><option value="">All topics</option>{KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
            <input name="industry" defaultValue={s("industry")} placeholder="Industry" className="input" />
            <input name="region" defaultValue={s("region")} placeholder="Region" className="input" />
            <input name="period" defaultValue={s("period")} placeholder="Period (e.g. 2026)" className="input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="saved" value="1" defaultChecked={!!s("saved")} /> Bookmarked only</label>
            <Button variant="outline">Filter</Button>
          </form>
          {query && (
            <form action={saveSearch} className="mb-4 flex gap-2">
              <input type="hidden" name="query" value={query} />
              <input name="name" required maxLength={80} placeholder="Name this search" className="input max-w-xs" />
              <Button variant="outline">Save search</Button>
            </form>
          )}
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
          <Card className="text-sm">
            <p className="font-semibold">Weekly digest</p>
            <p className="mt-1 text-muted">A weekly summary of newly approved contributions, in-app and by email.</p>
            <form action={setDigest} className="mt-3 grid gap-2">
              <input type="hidden" name="on" value={digest ? "0" : "1"} />
              {!digest && (
                <select name="offering_id" aria-label="Digest offering" className="input">
                  <option value="">All offerings</option>
                  {offerings?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              )}
              <Button variant={digest ? "outline" : "primary"}>{digest ? "Unsubscribe" : "Subscribe"}</Button>
            </form>
            {digest && <p className="mt-2 text-xs text-muted">Subscribed{digest.offering_id ? ` to ${offerings?.find((o) => o.id === digest.offering_id)?.name}` : " to all offerings"}.</p>}
          </Card>
          <Card className="bg-brand-soft text-sm">
            <p className="font-semibold">Ask AIRA</p>
            <p className="mt-1 text-muted">Use the chat button at the bottom right for a cited summary of this feed.</p>
          </Card>
          {!!searches?.length && (
            <Card>
              <p className="mb-2 font-semibold">Saved searches</p>
              {searches.map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-2 border-t border-line py-2 text-sm first:border-0">
                  <Link href={`/learning?${x.query}`} className="underline">{x.name}</Link>
                  <form action={deleteSearch}><input type="hidden" name="id" value={x.id} /><button className="text-xs text-muted">Remove</button></form>
                </div>
              ))}
            </Card>
          )}
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
