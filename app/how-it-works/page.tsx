import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

export const metadata: Metadata = {
  title: "How Kelus evaluates an electronics offer",
  description: "See how Kelus checks exact product matches, known total price, seller evidence, available return terms, and real price history before making a recommendation.",
};

const steps = [
  { icon: "search", number: "01", title: "Tell us what you want", copy: "Search for a product and choose the configuration and condition that suit you." },
  { icon: "tag", number: "02", title: "Compare the offers that matter", copy: "Kelus puts price, shipping, seller quality, and available retailer terms side-by-side." },
  { icon: "history", number: "03", title: "Decide with confidence", copy: "Use price history and clear recommendations to buy now or set an alert for later." },
];

export default function HowItWorksPage() {
  return <main className="app-page"><KelusHeader />
    <section className="how-hero"><p className="eyebrow">How it works</p><h1>Shopping clarity<br/>starts here.</h1><p>Kelus takes the noise out of buying online, so you can see the deal behind the price in a few simple steps.</p><Link className="button button-primary" href="/">Start searching <Icon name="arrow" size={18}/></Link></section>
    <section className="steps-section section">{steps.map((step) => <article className="step-card" key={step.number}><div className="step-number">{step.number}</div><span className="step-icon"><Icon name={step.icon} size={27}/></span><h2>{step.title}</h2><p>{step.copy}</p></article>)}</section>
    <section className="how-section how-section-detail section"><div><p className="eyebrow">How Kelus helps</p><h2>Every price tells only part of the story.</h2><p className="section-copy">Kelus brings together the information that makes a purchase genuinely worth it, not just cheap.</p></div><div className="feature-grid"><article><Icon name="search"/><h3>Search once</h3><p>Find comparable offers from live eBay listings.</p></article><article><Icon name="shield"/><h3>See the full deal</h3><p>Price, seller quality, shipping, and available retailer terms in one clear view.</p></article><article><Icon name="history"/><h3>Buy at the right time</h3><p>Use real price history to decide whether to buy now or wait.</p></article></div></section>
    <section className="how-cta"><h2>Ready to find a better deal?</h2><p>Search once. Compare clearly. Buy confidently.</p><Link className="button button-primary" href="/">Compare prices <Icon name="arrow" size={18}/></Link></section>
    <SiteFooter />
  </main>;
}
