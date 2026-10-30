"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";

type Row = { href: string; title: string; excerpt: string; meta: string };

// lpas "Latest updates" list: ruled rows; on pointer devices a preview card follows the cursor.
export function HoverList({ rows }: { rows: Row[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Row | null>(null);
  const move = (e: React.MouseEvent) => {
    if (!box.current) return;
    box.current.style.transform = `translate3d(${e.clientX + 24}px, ${e.clientY - 80}px, 0)`;
  };
  return (
    <div onMouseMove={move} onMouseLeave={() => setActive(null)} className="relative">
      <ul className="border-t border-line-strong">
        {rows.map((r) => (
          <li key={r.href + r.title} onMouseEnter={() => setActive(r)} className="border-b border-line-strong">
            <Link href={r.href} className="group grid items-center gap-x-6 gap-y-1 py-5 md:grid-cols-[1.2fr_1.6fr_auto_auto]">
              <span className="title-sm">{r.title}</span>
              <span className="truncate text-muted">{r.excerpt}</span>
              <span className="text-xs font-semibold">{r.meta}</span>
              <span className="circle-btn hidden text-muted md:inline-grid"><ArrowRight size={14} aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={box} aria-hidden
        className={`pointer-events-none fixed left-0 top-0 z-30 hidden w-80 transition-opacity duration-300 [@media(hover:hover)_and_(pointer:fine)]:block ${active ? "opacity-100" : "opacity-0"}`}>
        <div className="hero-glow chamfer-br flex aspect-[33/21] flex-col justify-end p-5 text-white [--cut:1.875rem]">
          <p className="eyebrow text-brand">Insight</p>
          <p className="mt-1 font-medium leading-snug">{active?.title}</p>
        </div>
      </div>
    </div>
  );
}
