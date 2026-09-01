import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MethodologyPanels } from "@/components/MethodologyPanels";
import { SafeLink as Link } from "@/components/SafeLink";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "How Kelus chooses Our Pick",
  description: "See how Kelus validates comparable eBay offers and chooses a recommendation using only available evidence.",
  alternates: { canonical: "https://kelus.me/methodology" },
};

export default function MethodologyPage() {
  return <main className="app-page methodology-page">
    <KelusHeader/>
    <section className="method-explorer section"><div className="method-heading"><div><p className="eyebrow">How Our Pick works</p><h1>See what Kelus checks.</h1></div><p>Five checks turn a live listing into a recommendation you can inspect.</p></div><MethodologyPanels/></section>
    <section className="method-note section"><p>Kelus currently compares matching eBay listings. Unknown facts stay unknown, and price history appears only after enough real observations exist.</p><Link className="text-link" href="/">Start searching <Icon name="arrow" size={16}/></Link></section>
    <SiteFooter />
  </main>;
}
