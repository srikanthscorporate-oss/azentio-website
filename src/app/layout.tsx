import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { AiraMount } from "@/components/aira-mount";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Instrument_Sans } from "next/font/google";
import { Motion } from "@/components/motion";
import "./globals.css";

const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });


export const metadata: Metadata = {
  title: { default: "azentio.ai", template: "%s · azentio.ai" },
  description: "Build intelligence. Create shared value. Enterprise AI products and a governed collaboration portal.",
  // iOS Safari otherwise rewrites numbers/emails into links before hydration, which breaks it.
  formatDetection: { telephone: false, email: false, address: false, date: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Motion />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
        <Suspense fallback={<div className="h-16 bg-navy" />}><SiteHeader /></Suspense>
        <main id="main-content" className="flex-1"><Suspense fallback={<PageSkeleton />}>{children}</Suspense></main>
        <Suspense fallback={null}><AiraMount /></Suspense>
        <SiteFooter />
      </body>
    </html>
  );
}
