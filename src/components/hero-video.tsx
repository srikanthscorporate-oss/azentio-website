"use client";
import { useEffect, useRef } from "react";

// Full-bleed hero video: the Azentio Loan Origination walkthrough, self-hosted so no player chrome ever shows.
// It autoplays without JavaScript, and restarts from 0:00 once the load intro lifts.
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { v.pause(); return; }
    const go = () => { v.currentTime = 0; v.play().catch(() => {}); };
    window.addEventListener("azentio:intro-done", go, { once: true });
    const t = window.setTimeout(go, 4000);
    return () => { window.removeEventListener("azentio:intro-done", go); window.clearTimeout(t); };
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      <video ref={ref} src="/videos/azentio-hero.mp4" poster="/images/azentio-hero-poster.jpg" muted loop autoPlay playsInline preload="auto"
        disablePictureInPicture disableRemotePlayback tabIndex={-1}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-navy-deep/55" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-deep/80 to-transparent" />
    </div>
  );
}
