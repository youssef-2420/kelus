import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./revision-studio.css";
import "./home-folio.css";
import "./notion-product.css";
import "./notion-paper.css";
import "./paper-loop.css";
import "./hero-poster.css";
import { LearnerProvider } from "@/components/LearnerProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kelus.me"),
  title: "Kelus — Revise your lessons. Prepare for exams.",
  description: "Revise your course material with recall questions, application practice, and answer feedback. Kelus uses your answers to suggest what to review before your exam.",
  openGraph: {
    type: "website",
    url: "https://kelus.me/",
    siteName: "Kelus",
    title: "Kelus — Revise your lessons. Prepare for exams.",
    description: "Practise recalling your lessons, check your answers, and revisit weaker topics before your exam.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`} data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${sourceSerif.variable} is-notion-system`}>
        <GoogleAnalytics />
        <a className="skip" href="#main">Skip to content</a>
        <AuthProvider>
          <LearnerProvider>
            <TooltipProvider>
              <SiteHeader />
              <RouteTransition>{children}</RouteTransition>
              <Toaster />
            </TooltipProvider>
          </LearnerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
