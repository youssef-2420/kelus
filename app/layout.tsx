import type { Metadata } from "next";
import { Instrument_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { LearnerProvider } from "@/components/LearnerProvider";

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
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <a className="skip" href="#main">Skip to content</a>
        <LearnerProvider>{children}</LearnerProvider>
      </body>
    </html>
  );
}
