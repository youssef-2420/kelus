import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import Link from "next/link";

const steps = [
  { icon: "search", number: "01", title: "Tell us what you want", copy: "Search for a product, choose the condition and variant that suit you, then set your location." },
  { icon: "tag", number: "02", title: "Compare the offers that matter", copy: "Kelus puts price, delivery, seller quality, warranty, and returns side-by-side." },
  { icon: "history", number: "03", title: "Decide with confidence", copy: "Use price history and clear recommendations to buy now or set an alert for later." },
];

export default function HowItWorksPage() {
  return <main className="app-page"><KelusHeader />
    <section className="how-hero"><p className="eyebrow">How it works</p><h1>Shopping clarity<br/>starts here.</h1><p>Kelus takes the noise out of buying online, so you can see the deal behind the price in a few simple steps.</p><Link className="button button-primary" href="/">Start comparing <Icon name="arrow" size={18}/></Link></section>
    <section className="steps-section section">{steps.map((step) => <article className="step-card" key={step.number}><div className="step-number">{step.number}</div><span className="step-icon"><Icon name={step.icon} size={27}/></span><h2>{step.title}</h2><p>{step.copy}</p></article>)}</section>
    <section className="how-compare section"><div><p className="eyebrow">The Kelus difference</p><h2>We help you compare the parts that change the value of a deal.</h2></div><div className="compare-points"><p><Icon name="tag"/>The real total, not just the listed price</p><p><Icon name="shield"/>Seller, manufacturer warranty, and retailer return terms</p><p><Icon name="history"/>Price history that tells you when to buy</p></div></section>
    <section className="how-cta"><h2>Ready to find a better deal?</h2><p>Search once. Compare clearly. Buy confidently.</p><Link className="button button-primary" href="/">Compare prices <Icon name="arrow" size={18}/></Link></section>
  </main>;
}
