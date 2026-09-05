import type { Metadata } from "next";
import { Instrument_Sans, Inter_Tight, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./product.css";
import { LearnerProvider } from "@/components/LearnerProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const ledger = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-ledger",
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
    <html lang="en" className={cn("font-sans", sans.variable, display.variable, ledger.variable)}>
      <body className={`${display.variable} ${sans.variable} ${ledger.variable}`}>
        <a className="skip" href="#main">Skip to content</a>
        <LearnerProvider>
          <TooltipProvider>
            <RouteTransition>{children}</RouteTransition>
            <Toaster />
          </TooltipProvider>
        </LearnerProvider>
      </body>
    </html>
  );
}
