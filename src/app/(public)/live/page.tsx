import { Container, Empty, PageHeader } from "@/components/ui";
import { LiteYouTube } from "@/components/lite-youtube";
import { getPublicContent } from "@/lib/public-data";
import { videoIdFromUrl } from "@/lib/videos";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: "Live" };

// Public Live shows only recordings published to the public audience.
// Internal broadcasts live behind sign-in at /employee/live.
export default async function Live() {
  const recordings = (await getPublicContent("video")).map((v) => ({ ...v, vid: videoIdFromUrl(v.external_url) })).filter((v) => v.vid).slice(0, 4);
  return (
    <>
      <Container>
        <PageHeader eyebrow="azentio.ai Live" title="Conversations Where Intelligence Comes Alive.">
          No public session is on air right now. Past public recordings are below.
        </PageHeader>
      </Container>
      <Container className="pb-20">
        <p className="mb-6 inline-flex items-center gap-2 rounded-md border border-line px-3 py-1 text-xs font-bold text-muted"><span className="h-2 w-2 rounded-full bg-muted" aria-hidden /> Off air</p>
        {!recordings.length ? <Empty title="No public recordings yet" /> : (
          <div className="grid gap-8 md:grid-cols-2">
            {recordings.map((r) => (
              <article key={r.id}>
                <LiteYouTube id={r.vid!} title={r.title} thumbnail={r.vid === "QW3TEZJYb0c" ? "/images/gcc-lending-webinar.jpg" : undefined} />
                <h2 className="mt-3 font-bold">{r.title}</h2>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
