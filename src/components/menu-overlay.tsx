"use client";
import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Item = readonly [string, string];

// lpas-style "Menu" pill that opens a full-screen navigation overlay.
// Any link click or form submit inside the overlay closes it, so navigating never leaves the menu open.
export function MenuOverlay({ primary, portal, footer }: { primary: readonly Item[]; portal: readonly Item[]; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const link = ([href, l]: Item, i: number, big: boolean) => {
    const active = path === href || path.startsWith(href + "/");
    return (
      <li key={href} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
        className={clsx("transition duration-500 [transition-timing-function:cubic-bezier(.33,1,.68,1)]", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}>
        <Link href={href} aria-current={active ? "page" : undefined}
          className={clsx(big ? "display-md" : "title-sm", "transition-colors", active ? "text-brand" : "text-white/85 hover:text-white")}>{l}</Link>
      </li>
    );
  };

  return (
    <>
      <button ref={btn} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu"
        className="relative z-[60] flex items-center gap-3 rounded-lg bg-[#0e0e0e99] py-1.5 pl-3 pr-1.5 text-sm font-medium text-white backdrop-blur-[5px]">
        {open ? "Close" : "Menu"}
        <span className="grid h-7 w-10 place-items-center rounded-md bg-navy" aria-hidden>
          <span className="relative block h-3 w-5">
            <span className={clsx("absolute left-0 h-px w-5 bg-white transition-transform duration-300", open ? "top-1.5 rotate-45" : "top-0.5")} />
            <span className={clsx("absolute left-0 h-px w-5 bg-white transition-transform duration-300", open ? "top-1.5 -rotate-45" : "top-2.5")} />
          </span>
        </span>
      </button>

      <div id="site-menu" ref={panel} role="dialog" aria-modal="true" aria-label="Site menu" hidden={!open} data-lenis-prevent
        onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }} onSubmit={() => setOpen(false)}
        className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/97 text-white backdrop-blur-sm">
        <div className="mx-auto grid min-h-full max-w-6xl gap-12 px-4 pb-12 pt-28 md:grid-cols-[1.4fr_1fr] md:px-8">
          <nav aria-label="Main">
            <ul className="grid gap-3">{primary.map((it, i) => link(it, i, true))}</ul>
          </nav>
          <div className="grid content-start gap-10">
            {portal.length > 0 && (
              <nav aria-label="Portal">
                <p className="eyebrow mb-4 text-white/50">Your workspace</p>
                <ul className="grid gap-2">{portal.map((it, i) => link(it, i + primary.length, false))}</ul>
              </nav>
            )}
            <div className={clsx("transition duration-500", open ? "opacity-100" : "opacity-0")} style={{ transitionDelay: open ? "400ms" : "0ms" }}>{footer}</div>
          </div>
        </div>
      </div>
    </>
  );
}
