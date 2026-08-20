import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { TrustRow } from "@/components/TrustRow";
import { Icon } from "@/components/Icon";

export default function Home() {
  return <main><KelusHeader />
    <section className="hero"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><p className="eyebrow">Independent shopping intelligence</p><h1>Shop smarter.<br/>Know before you buy.</h1><p className="hero-copy">Compare trusted offers, understand the trade-offs, and buy with confidence.</p><SearchControls /><TrustRow /></section>
    <section className="how-section section"><div><p className="eyebrow">How Kelus helps</p><h2>Every price tells only part of the story.</h2></div><div className="feature-grid"><article><Icon name="search"/><h3>Search once</h3><p>Find comparable offers from retailers you already trust.</p></article><article><Icon name="shield"/><h3>See the full deal</h3><p>Price, protection, seller quality, and returns in one clear view.</p></article><article><Icon name="history"/><h3>Buy at the right time</h3><p>Use price history to decide whether to buy now or wait.</p></article></div></section>
    <section className="demo-note"><Icon name="lock" size={17}/>Demo experience — retailer offers shown here are illustrative.</section>
  </main>;
}
