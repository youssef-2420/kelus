import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { LearnerProvider } from "@/components/LearnerProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
const ledger = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kelus.me"),
  title: "Kelus — Know what to study next",
  description: "Kelus looks at what you know, what’s fading, and the time you have — then gives you today’s exam plan.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://kelus.me/",
    siteName: "Kelus",
    title: "Kelus — Know what to study next",
    description: "A focused daily exam plan that changes as you learn.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ledger.variable}>
      <body className={ledger.variable}>
        <a className="skip" href="#main">Skip to content</a>
        <LearnerProvider>
          <TooltipProvider>
            <SiteHeader />
            <RouteTransition>{children}</RouteTransition>
            <Toaster />
          </TooltipProvider>
        </LearnerProvider>
      </body>
    </html>
  );
}
