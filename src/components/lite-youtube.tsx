"use client";
import { useState } from "react";
import { Play } from "lucide-react";

// Thumbnail first; the YouTube iframe (and its cookies/scripts) loads only when the viewer clicks play.
export function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  if (play) {
    return <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-xl" />;
  }
  return (
    <button onClick={() => setPlay(true)} className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-navy" aria-label={`Play: ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition duration-700 [transition-timing-function:var(--ease-out)] group-hover:scale-105 group-hover:opacity-100" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-navy transition duration-500 group-hover:scale-110"><Play size={22} fill="currentColor" /></span>
      </span>
    </button>
  );
}
