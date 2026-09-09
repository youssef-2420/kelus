import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import "./revision-studio.css";
import { LearnerProvider, LearnerScopeGate } from "@/components/LearnerProvider";
import { RouteTransition } from "@/components/RouteTransition";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ExamPassCapture } from "@/components/ExamPassCapture";
const ledger = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["300", "400", "600"],
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
    <html lang="en" className={ledger.variable} data-scroll-behavior="smooth">
      <body className={ledger.variable}>
        <GoogleAnalytics />
        <a className="skip" href="#main">Skip to content</a>
        <AuthProvider>
          <LearnerProvider>
            <ExamPassCapture />
            <TooltipProvider>
              <SiteHeader />
              <LearnerScopeGate>
                <RouteTransition>{children}</RouteTransition>
              </LearnerScopeGate>
              <Toaster />
            </TooltipProvider>
          </LearnerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
