"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// lpas pinned horizontal strip: on wide pointer screens the section pins and vertical scroll moves the cards sideways.
// On touch, small screens or reduced motion the cards simply stack.
export function HScroll({ children, label }: { children: ReactNode; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setPin(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!pin) return;
    const w = wrap.current!, t = track.current!;
    let raf = 0;
    const size = () => { w.style.height = `${t.scrollWidth - window.innerWidth + window.innerHeight}px`; };
    const frame = () => {
      const r = w.getBoundingClientRect();
      const max = t.scrollWidth - window.innerWidth;
      const p = Math.min(1, Math.max(0, -r.top / (w.offsetHeight - window.innerHeight)));
      t.style.transform = `translate3d(${-p * max}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    size();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size); w.style.height = ""; t.style.transform = ""; };
  }, [pin]);

  return (
    <section ref={wrap} aria-label={label} className="relative">
      <div className={pin ? "sticky top-0 h-screen overflow-hidden" : ""}>
        <div ref={track} className={pin ? "flex h-full w-max will-change-transform" : "grid"}>{children}</div>
      </div>
    </section>
  );
}
