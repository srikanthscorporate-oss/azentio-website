import Link from "next/link";
import { ArrowRight, ArrowUp } from "lucide-react";
import { Logo } from "@/components/logo";

const COLS: [string, [string, string][]][] = [
  ["Explore", [["/products", "Products"], ["/solutions", "Solutions"], ["/lab", "AI Lab"], ["/technology", "Technology"]]],
  ["Discover", [["/media", "Media"], ["/live", "Live"], ["/insights", "Insights"], ["/about", "About"]]],
  ["Connect", [["/connect", "Request demo"], ["/connect?interest=collaboration", "Collaborate"], ["/hackathon/register", "Hackathons"], ["/login", "Client & employee sign in"]]],
];

export function SiteFooter() {
  return (
    <footer className="text-white">
      {/* Brand band: the same navy glow and mint grid used across the site, leading into the footer */}
      <div className="hero-glow relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-25 [background-image:linear-gradient(#b8efb5_1px,transparent_0),linear-gradient(90deg,#b8efb5_1px,transparent_0)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_75%_50%,black,transparent_70%)]" />
        <div className="relative mx-auto flex max-w-[100rem] flex-wrap items-end justify-between gap-8 px-4 py-16 md:px-8 md:py-24 lg:px-12">
          <p className="display-lg max-w-3xl">Build Intelligence.<br /><span className="text-brand">Create Impact.</span></p>
          <Link href="/connect" className="group line-link pb-1">Start a conversation <span className="circle-btn"><ArrowRight size={14} aria-hidden /></span></Link>
        </div>
      </div>
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
