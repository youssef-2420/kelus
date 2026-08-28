/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelus — Shop smarter. Know before you buy.",
  description: "Kelus compares price, warranty, retailer return terms, and history so you can choose the offer that is actually worth buying.",
  metadataBase: new URL("https://kelus.me"),
  openGraph: { title: "Kelus — Shop smarter. Know before you buy.", description: "Compare offers and buy with confidence.", images: ["/og.png"] },
  icons: {
    icon: [{ url: "/kelus-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/kelus-icon.png",
    apple: "/kelus-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap"/>
  </head><body><AuthProvider>{children}</AuthProvider></body></html>;
}
