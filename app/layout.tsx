import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelus — Shop smarter. Know before you buy.",
  description: "Kelus compares price, warranty, retailer return terms, and history so you can choose the offer that is actually worth buying.",
  metadataBase: new URL(process.env.KELUS_CUSTOM_DOMAIN === "true" ? "https://kelus.me" : process.env.GITHUB_ACTIONS ? "https://youssef-2420.github.io/kelus" : "http://localhost:3000"),
  openGraph: { title: "Kelus — Shop smarter. Know before you buy.", description: "Compare offers and buy with confidence.", images: ["/og.png"] },
  icons: {
    icon: [{ url: "/kelus-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/kelus-icon.png",
    apple: "/kelus-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
