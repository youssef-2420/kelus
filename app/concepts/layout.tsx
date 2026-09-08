import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concept — Kelus",
  robots: { index: false, follow: false },
};

export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
