import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "azentio.ai", template: "%s · azentio.ai" },
  description: "Build intelligence. Create shared value. Enterprise AI products and a governed collaboration portal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}><Reveal /></Suspense>
        <a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>
        <Suspense fallback={<div className="h-14 border-b border-line bg-surface" />}><SiteHeader /></Suspense>
        <main id="main-content" className="flex-1"><Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-muted">Loading…</div>}>{children}</Suspense></main>
        <footer className="border-t border-line bg-surface py-8 text-sm text-muted">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4">
            <span><span className="font-semibold text-brand">azentio</span>.ai. Build intelligence. Create shared value.</span>
            <span>All demo data is synthetic. Sandbox outputs are simulations, not credit or business decisions.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
