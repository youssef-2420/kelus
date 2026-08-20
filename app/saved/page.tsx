"use client";

import { useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import Link from "next/link";

const key = "kelus-watched-products";
export default function SavedPage() {
  const [items, setItems] = useState<string[]>(() => typeof window === "undefined" ? [] : JSON.parse(window.localStorage.getItem(key) ?? "[]"));
  function remove(item: string) { const next = items.filter((entry) => entry !== item); window.localStorage.setItem(key, JSON.stringify(next)); setItems(next); }
  return <main className="app-page"><KelusHeader /><section className="saved-page section"><p className="eyebrow">Your price alerts</p><h1>Keep an eye on the things you want.</h1><p className="saved-intro">Tracked products stay in this browser. Add a target price and Kelus will make the next decision easier.</p>{items.length ? <div className="saved-list">{items.map((item) => <article className="saved-card" key={item}><ProductMark/><div><h2>{item}</h2><p>Best current offer: <b>$749</b> · $50 below average</p></div><span className="price-status"><Icon name="history" size={17}/>Low for 6 months</span><Link className="button button-secondary" href="/product/iphone-17">View details</Link><button className="icon-button" onClick={() => remove(item)} aria-label={'Remove ' + item}><Icon name="close" size={18}/></button></article>)}</div> : <div className="empty-state"><span><Icon name="bell" size={28}/></span><h2>No price alerts yet</h2><p>Track a product to keep its best offer and price history close by.</p><Link className="button button-primary" href="/">Start a search <Icon name="arrow" size={18}/></Link></div>}<p className="demo-note"><Icon name="lock" size={17}/>This demo stores alerts locally in your browser only.</p></section></main>;
}
