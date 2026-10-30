"use client";
import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";

export function PortalNav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  return (
    <nav aria-label="Portal" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 text-sm">
      {items.map(([href, label]) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={clsx("whitespace-nowrap border-b-2 px-3 py-2.5 font-bold transition-colors", active ? "border-brand text-brand" : "border-transparent text-white/75 hover:text-white")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
