import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="relative z-[60] text-2xl font-medium tracking-tight text-white" aria-label="azentio.ai home">
      <span className="text-brand">a</span>zentio<span className="text-brand">.ai</span>
    </Link>
  );
}
