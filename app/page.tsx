import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { TrustRow } from "@/components/TrustRow";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

function HeroDevices() {
  return <div className="hero-devices" aria-hidden="true">
    <div className="device-tablet"><i/><b/></div><div className="device-watch"><i/></div>
    <div className="device-laptop"><i/></div><div className="device-headphones"><i/><i/></div>
    <div className="device-controller"><i/><i/><i/></div>
  </div>;
}

export default function Home() {
  return <main><KelusHeader />
    <section className="hero hero-figma"><HeroDevices /><div className="hero-line line-a"/><div className="hero-line line-b"/>
      <div className="hero-content"><p className="eyebrow">Independent shopping intelligence</p><h1>Shop smarter.<br/>Know before you buy.</h1><p className="hero-copy">Compare current offers, understand the trade-offs, and buy with confidence.</p></div><div id="product-search"><SearchControls /></div><TrustRow />
    </section>
    <section className="how-section section"><div><p className="eyebrow">How Kelus helps</p><h2>Every price tells only part of the story.</h2><p className="section-copy">Kelus brings together the information that makes a purchase genuinely worth it, not just cheap.</p><Link className="text-link" href="/how-it-works">See how Kelus works <Icon name="arrow" size={15}/></Link></div><div className="feature-grid"><article><Icon name="search"/><h3>Search once</h3><p>Find comparable offers from live eBay listings.</p></article><article><Icon name="shield"/><h3>See the full deal</h3><p>Price, seller quality, shipping, and available retailer terms in one clear view.</p></article><article><Icon name="history"/><h3>Buy at the right time</h3><p>Use price history to decide whether to buy now or wait.</p></article></div></section>
    <section className="demo-note"><Icon name="lock" size={17}/>Live eBay offers are labeled clearly. Price history appears only when enough real data exists.</section>
  </main>;
}
