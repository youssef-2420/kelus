import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { SearchControls } from "@/components/SearchControls";
import { TrustRow } from "@/components/TrustRow";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { products } from "@/lib/demo-data";
import { canonicalProductPath } from "@/lib/search-state";

function HeroDevices() {
  return <div className="hero-devices" aria-hidden="true">
    <div className="device-tablet"><i/><b/></div><div className="device-watch"><i/></div>
    <div className="device-laptop"><i/></div><div className="device-headphones"><i/><i/></div>
    <div className="device-controller"><i/><i/><i/></div>
  </div>;
}

export default function Home() {
  const discoverable = products.slice(0, 12).map((product) => ({
    product,
    href: canonicalProductPath({ productSlug: product.slug, variantId: product.searchAttribute.validVariantIds[0], condition: "new", market: "us" }),
  }));
  return <main><LandingAnalytics/><KelusHeader />
    <section className="hero hero-figma"><HeroDevices /><div className="hero-line line-a"/><div className="hero-line line-b"/>
      <div id="product-search"><SearchControls deferProductSelection /></div><div className="hero-content"><p className="eyebrow">Independent shopping intelligence</p><h1>Shop smarter.<br/>Know before you buy.</h1><p className="hero-copy">Compare current offers, understand the trade-offs, and buy with confidence.</p></div><TrustRow />
    </section>
    <section className="how-brief section"><p>See how Kelus finds and evaluates comparable offers.</p><div><Link className="text-link" href="/how-it-works">How Kelus works <Icon name="arrow" size={15}/></Link><Link className="text-link" href="/methodology">How Kelus picks <Icon name="arrow" size={15}/></Link></div></section>
    <section className="catalog-links section"><p className="eyebrow">Popular searches</p><div>{discoverable.map(({ product, href }) => <Link key={product.slug} href={href}>{product.brand} {product.name}</Link>)}</div></section>
    <section className="demo-note"><Icon name="lock" size={17}/>Live eBay offers are labeled clearly. Price history appears only when enough real data exists.</section>
  </main>;
}
