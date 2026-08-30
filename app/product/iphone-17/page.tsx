import { KelusHeader } from "@/components/KelusHeader";
import { OfferCard } from "@/components/OfferCard";
import { PriceChart } from "@/components/PriceChart";
import { WatchButton } from "@/components/WatchButton";
import { Icon } from "@/components/Icon";
import { featuredProduct, offers, priceHistory } from "@/lib/demo-data";
import { getRecommendation } from "@/services/recommendations";
import Link from "next/link";

export default function ProductPage() {
  const recommendation = getRecommendation(offers, "kelus_pick")!;
  const recommendedOffer = offers.find((offer) => offer.id === recommendation.offerId)!;
  const bestPrice = Math.min(...offers.map((offer) => offer.price + offer.shippingCost));
  const historyHigh = Math.max(...priceHistory.map((point) => point.price));
  const historyAverage = Math.round(priceHistory.reduce((sum, point) => sum + point.price, 0) / priceHistory.length);
  const currentHistoryPrice = priceHistory.at(-1)!.price;
  return <main className="app-page"><KelusHeader /><section className="product-hero section"><Link className="crumb" href="/results">← Back to results</Link><div className="product-hero-grid"><div className="product-visual"><span className="product-mark product-mark-large"><span>IPH</span></span></div><div><p className="eyebrow">Apple · Smartphone</p><h1>{featuredProduct.name}</h1><p className="product-lede">Compare current offers across price, condition, delivery, warranty, and returns.</p><div className="product-actions"><Link className="button button-primary" href="/compare/iphone-17">Compare offers <Icon name="arrow" size={18}/></Link><WatchButton /></div><div className="stat-row"><span><b>{offers.length}</b> offers compared</span><span><b>${bestPrice}</b> best listed price</span><span><b>{priceHistory.length} mo.</b> demo history</span></div></div></div></section>
    <section className="detail-grid section"><div><div className="section-heading"><div><p className="eyebrow">The recommended offer</p><h2>Best balance of price and peace of mind.</h2></div><Link className="text-link" href="/results">See all offers <Icon name="arrow" size={15}/></Link></div><OfferCard offer={recommendedOffer}/></div><aside className="detail-insight"><div className="insight-title"><h2>Illustrative price history</h2><b>Demo insight</b></div><PriceChart points={priceHistory}/><p>The example retailer price is tied for the six-month low. Live price history is not connected yet.</p><div className="price-facts"><span>6-month high <b>${historyHigh}</b></span><span>6-month average <b>${historyAverage}</b></span><span>Example today <b>${currentHistoryPrice}</b></span></div></aside></section>
    <section className="section buying-guide"><p className="eyebrow">What we compare</p><h2>Choose the offer that fits how you shop.</h2><div className="guide-grid"><article><Icon name="tag"/><h3>True price</h3><p>We put headline price and delivery together, so there are no surprise trade-offs.</p></article><article><Icon name="shield"/><h3>Warranty and seller terms</h3><p>Manufacturer warranty and seller information are visible before you click away.</p></article><article><Icon name="history"/><h3>Return flexibility</h3><p>Know the retailer or seller return terms before you choose an offer.</p></article></div></section></main>;
}
