"use client";
import { useEffect, useState } from "react";

// Full-bleed background video (lpas hero), from the official Azentio YouTube channel.
// The poster shows first; the muted looping embed loads after hydration and never for reduced-motion users.
export function HeroVideo({ id, start = 0, end }: { id: string; start?: number; end?: number }) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setPlay(true), 300);
    return () => window.clearTimeout(t);
  }, []);
  const params = new URLSearchParams({
    autoplay: "1", mute: "1", loop: "1", playlist: id, controls: "0", disablekb: "1", playsinline: "1",
    rel: "0", iv_load_policy: "3", modestbranding: "1", start: String(start), ...(end ? { end: String(end) } : {}),
  });
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {play && (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?${params}`} title="" tabIndex={-1} allow="autoplay; encrypted-media"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-[100svh] w-screen min-w-[177.78svh] -translate-x-1/2 -translate-y-1/2 scale-[1.15] border-0" />
      )}
      <div className="absolute inset-0 bg-navy-deep/55" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-deep/80 to-transparent" />
    </div>
  );
}
