import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AppSignInToast } from "@/components/AppSignInToast";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SiteJsonLd } from "@/components/SiteJsonLd";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelus — Shop smarter. Know before you buy.",
  description: "Kelus evaluates exact product matches, known total price, seller evidence, available return terms, and real price history to identify the offer worth buying.",
  metadataBase: new URL("https://kelus.me"),
  openGraph: { title: "Kelus — Shop smarter. Know before you buy.", description: "Compare offers and buy with confidence.", images: ["/og.png"] },
  icons: {
    icon: [{ url: "/kelus-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/kelus-icon.png",
    apple: "/kelus-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><GoogleAnalytics /><SiteJsonLd /></head><body><AuthProvider><AppSignInToast/>{children}</AuthProvider></body></html>;
}
