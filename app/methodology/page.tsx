import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
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
    <section className="method-hero section"><p className="eyebrow">Recommendation methodology</p><h1>Trust starts with<br/>showing the work.</h1><p>Kelus does not recommend the lowest number blindly. Every candidate must first prove that it is the right product and a genuinely comparable offer.</p></section>
    <section className="method-explorer section"><div className="method-heading"><div><p className="eyebrow">The validation path</p><h2>From listing to Our Pick.</h2></div><p>Select each step to see what Kelus checks—and what it refuses to assume.</p></div><MethodologyPanels/></section>
    <section className="method-boundaries section"><div><p className="eyebrow">Honest boundaries</p><h2>What Kelus does not claim.</h2></div><ul><li><strong>Not the entire market.</strong><span>Live comparisons currently cover matching eBay listings.</span></li><li><strong>No invented terms.</strong><span>Unknown shipping, returns, warranty, or seller facts remain unknown.</span></li><li><strong>No fabricated history.</strong><span>Until enough real observations exist, Kelus says price history is building.</span></li></ul></section>
    <section className="method-cta"><p>See the methodology applied to a real comparison.</p><Link className="button button-primary" href="/">Start searching <Icon name="arrow" size={18}/></Link></section>
  </main>;
}
