import { Suspense } from "react";
import { getPublicContent } from "@/lib/public-data";
import { Container, Empty } from "@/components/ui";
import { LiteYouTube } from "@/components/lite-youtube";
import { videoCategory, videoIdFromUrl } from "@/lib/videos";

// Public page: validated in dev to render an instant static shell.
export const instant = true;

export const metadata = { title: "Media & videos" };

// The static hero renders instantly; the filter (which depends on the URL) streams in below it.
export default function Media({ searchParams }: PageProps<"/media">) {
  return (
    <>
      <section className="hero-glow text-white">
        <Container className="pb-10 pt-20">
          <p className="eyebrow text-brand">Media & videos</p>
          <h1 className="display-xl mt-5">Ideas Worth Watching.<br /><span className="text-brand">Stories Worth Sharing.</span></h1>
        </Container>
      </section>
      <Suspense fallback={<Container className="py-16"><div className="h-64 animate-pulse rounded-[10px] bg-bg" /></Container>}>
        <VideoGrid searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function VideoGrid({ searchParams }: { searchParams: PageProps<"/media">["searchParams"] }) {
  const { c } = await searchParams;
  const all = (await getPublicContent("video"))
    .map((v) => ({ ...v, vid: videoIdFromUrl(v.external_url) }))
    .filter((v) => v.vid)
    .map((v) => ({ ...v, cat: videoCategory(v.vid) }));
  const cats = [...new Set(all.map((v) => v.cat))];
  const shown = typeof c === "string" ? all.filter((v) => v.cat === c) : all;
  const pill = (active: boolean) => `rounded-full border px-4 py-1.5 font-bold ${active ? "border-brand bg-brand text-navy" : "border-white/25 text-white hover:border-brand"}`;

  return (
    <>
      <div className="hero-glow text-white">
        <Container className="pb-14">
          <nav aria-label="Video categories" className="flex flex-wrap gap-2 text-sm">
            <a href="/media" aria-current={!c ? "page" : undefined} className={pill(!c)}>All</a>
            {cats.map((x) => <a key={x} href={`/media?c=${encodeURIComponent(x)}`} aria-current={c === x ? "page" : undefined} className={pill(c === x)}>{x}</a>)}
          </nav>
        </Container>
      </div>
      <Container className="py-16">
        {!shown.length ? <Empty title="No videos published yet" /> : (
          <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
            {shown.map((v) => (
              <article key={v.id} data-reveal>
                <LiteYouTube id={v.vid!} title={v.title} thumbnail={v.vid === "QW3TEZJYb0c" ? "/images/gcc-lending-webinar.jpg" : undefined} />
                <p className="eyebrow mt-4 text-brand-ink">{v.cat}</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">{v.title}</h2>
              </article>
            ))}
          </div>
        )}
        <p className="mt-16 text-sm text-muted">Videos from Azentio's official YouTube channel. Playback loads from youtube-nocookie.com only when you press play.</p>
      </Container>
    </>
  );
}
