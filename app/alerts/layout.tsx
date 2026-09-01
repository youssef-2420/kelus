import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My price alerts — Kelus",
  description: "Track exact electronics configurations, monitor validated comparable prices, and return to the matching Kelus comparison when your target is reached.",
  robots: { index: false, follow: false },
};

export default function AlertsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
