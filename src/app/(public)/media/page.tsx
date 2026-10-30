import { createClient } from "@/lib/supabase/server";
import { Container, Empty } from "@/components/ui";
import { LiteYouTube } from "@/components/lite-youtube";
import { videoCategory, videoIdFromUrl } from "@/lib/videos";

export const metadata = { title: "Media & videos" };

export default async function Media({ searchParams }: PageProps<"/media">) {
  const { c } = await searchParams;
  const supabase = await createClient();
  // Public page: explicitly restricted to the public audience even for signed-in viewers.
  const { data } = await supabase.from("content_items").select("id, title, external_url").eq("kind", "video").eq("audience", "public").order("created_at", { ascending: false });
  const all = (data ?? []).map((v) => ({ ...v, vid: videoIdFromUrl(v.external_url) })).filter((v) => v.vid).map((v) => ({ ...v, cat: videoCategory(v.vid) }));
  const cats = [...new Set(all.map((v) => v.cat))];
  const shown = typeof c === "string" ? all.filter((v) => v.cat === c) : all;

  return (
    <>
      <section className="bg-navy text-white">
        <Container className="py-20">
          <p className="eyebrow text-white/50">Media & videos</p>
          <h1 className="display-xl mt-6">Stories, walkthroughs<br /><span className="text-brand">& perspectives.</span></h1>
          <nav className="mt-10 flex flex-wrap gap-2 text-sm">
            <a href="/media" className={`rounded-full border px-4 py-1.5 ${!c ? "border-brand bg-brand text-navy" : "border-white/20"}`}>All</a>
            {cats.map((x) => <a key={x} href={`/media?c=${encodeURIComponent(x)}`} className={`rounded-full border px-4 py-1.5 ${c === x ? "border-brand bg-brand text-navy" : "border-white/20"}`}>{x}</a>)}
          </nav>
        </Container>
      </section>
      <Container className="py-16">
        {!shown.length ? <Empty title="No videos published yet" /> : (
          <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
            {shown.map((v) => (
              <article key={v.id} data-reveal>
                <LiteYouTube id={v.vid!} title={v.title} />
                <p className="eyebrow mt-4 text-brand-ink">{v.cat}</p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">{v.title}</h2>
              </article>
            ))}
          </div>
        )}
        <p className="mt-16 text-sm text-muted">Videos from Azentio's official YouTube channel. Playback loads from youtube-nocookie.com only when you press play.</p>
      </Container>
    </>
  );
}
