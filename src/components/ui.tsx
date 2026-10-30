import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("mx-auto max-w-6xl px-4", className)} {...p} />;
}

// Every page opens with the prototype's navy hero band. It breaks out of the page container to full width.
export function PageHeader({ eyebrow, title, children, actions, scope }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode; scope?: ReactNode }) {
  return (
    <div className="hero-glow relative left-1/2 mb-10 w-screen -translate-x-1/2 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-14">
        {scope && <div className="mb-6">{scope}</div>}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-4 text-brand">{eyebrow}</p>}
            <h1 className="display-md">{title}</h1>
            {children && <div className="mt-4 max-w-2xl text-white/80">{children}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("rounded-[10px] border border-line bg-surface p-5", className)} {...p} />;
}

const tones = {
  neutral: "bg-bg text-muted border-line",
  brand: "bg-brand-soft text-brand-ink border-brand/40",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  navy: "bg-navy text-white border-navy",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold", tones[tone])}>{children}</span>;
}

const btn = {
  primary: "bg-brand text-navy hover:bg-[#7ddca3]",
  brand: "bg-brand text-navy hover:bg-[#7ddca3]",
  dark: "bg-navy text-white hover:bg-navy-deep",
  outline: "border border-line-strong bg-surface text-ink hover:border-brand-ink",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
} as const;
const btnBase = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: keyof typeof btn }) {
  return <button className={clsx(btnBase, btn[variant], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: keyof typeof btn }) {
  return <Link className={clsx(btnBase, btn[variant], className)} {...p} />;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="rounded-[10px] border border-dashed border-line-strong bg-bg p-10 text-center">
      <p className="font-bold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "brand", children }: { tone?: "brand" | "warn" | "danger"; children: ReactNode }) {
  const t = { brand: "bg-brand-soft border-brand/40", warn: "bg-warn-soft border-warn/30", danger: "bg-danger-soft border-danger/30" }[tone];
  return <div role={tone === "danger" ? "alert" : undefined} className={clsx("rounded-[10px] border p-4 text-sm", t)}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="eyebrow text-brand-ink">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function fmtDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set";
}

export const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading"><div className="hero-glow h-56" /><div className="mx-auto max-w-6xl px-4 pt-10">
      <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-[10px] bg-line/70" />)}</div>
    </div></div>
  );
}
