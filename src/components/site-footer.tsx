import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Logo } from "@/components/logo";

const COLS: [string, [string, string][]][] = [
  ["Explore", [["/products", "Products"], ["/solutions", "Solutions"], ["/lab", "AI Lab"], ["/technology", "Technology"]]],
  ["Discover", [["/media", "Media"], ["/live", "Live"], ["/insights", "Insights"], ["/about", "About"]]],
  ["Connect", [["/connect", "Request demo"], ["/connect?interest=collaboration", "Collaborate"], ["/hackathon", "Hackathons"], ["/login", "Client & employee sign in"]]],
];

export function SiteFooter() {
  return (
    <footer className="text-white">
      <div className="bg-navy-deep">
        <div className="mx-auto grid max-w-[100rem] gap-12 px-4 py-14 md:grid-cols-[1fr_auto] md:px-8 lg:px-12">
          <div className="grid gap-10 sm:grid-cols-3">
            {COLS.map(([title, links]) => (
              <nav key={title} aria-label={title}>
                <p className="mb-4 text-sm text-white/50">{title}</p>
                <ul className="grid gap-2">
                  {links.map(([href, l]) => <li key={href + l}><Link href={href} className="text-white/80 transition-colors hover:text-white">{l}</Link></li>)}
                </ul>
              </nav>
            ))}
          </div>
          <div className="md:text-right">
            <Logo />
          </div>
        </div>
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-6 text-xs text-white/60 md:px-8 lg:px-12">
          <span>© 2026 azentio.ai · Product information is indicative and subject to validation.</span>
          <span>All demo data is synthetic. Sandbox outputs are simulations, not credit or business decisions.</span>
          <a href="#main-content" className="inline-flex items-center gap-2 text-white hover:text-brand">Back to top <ArrowUp size={14} aria-hidden /></a>
        </div>
      </div>
    </footer>
  );
}
