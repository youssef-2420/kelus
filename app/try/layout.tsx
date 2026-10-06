import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try Kelus — a one-minute sample",
  description: "Answer three quick checks on a sample lecture page and explain it in your own words. No account, no upload.",
  alternates: { canonical: "/try" },
};

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
