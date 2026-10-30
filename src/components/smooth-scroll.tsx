"use client";
import { useEffect } from "react";
import Lenis from "lenis";

// lpas-style smooth wheel scrolling, used on the marketing home page only.
// Portal and form pages keep native scrolling so focus, find-in-page and keyboard scrolling are never fought.
export function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = requestAnimationFrame(function loop(t) { lenis.raf(t); raf = requestAnimationFrame(loop); });
    // let focus moves (Tab) scroll natively and resync Lenis afterwards
    const onFocus = () => lenis.resize();
    document.addEventListener("focusin", onFocus);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("focusin", onFocus); lenis.destroy(); };
  }, []);
  return null;
}
