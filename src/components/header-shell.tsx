"use client";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// On the home page the header floats transparently over the hero video (lpas); elsewhere it sits on navy.
export function HeaderShell({ children, below }: { children: ReactNode; below?: ReactNode }) {
  const home = usePathname() === "/";
  return (
    <header className={clsx("z-40 text-white", home ? "absolute inset-x-0 top-0" : "sticky top-0 bg-navy")}>
      {children}
      {below}
    </header>
  );
}
