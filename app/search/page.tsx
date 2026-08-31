import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchExperience } from "@/components/SearchExperience";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
};

export default function SearchPage() {
  return <main className="search-page"><KelusHeader /><SearchExperience /></main>;
}
