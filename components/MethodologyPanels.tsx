"use client";

import { useState } from "react";

const panels = [
  { number: "01", title: "Exact match", short: "Right product first.", copy: "Kelus checks the model, declared configuration, condition, listing type, and—when relevant—network status. Structured eBay fields lead; listing-title evidence is used as a second check.", evidence: ["Wrong models and sibling products are rejected", "Accessories, parts, auctions, and incompatible variants are excluded", "Conflicting listing evidence does not silently pass"] },
  { number: "02", title: "Known total", short: "Price plus known shipping.", copy: "Offers are compared using item price plus shipping only when shipping is known. Kelus does not label an unknown shipping charge as free or estimate a missing cost.", evidence: ["Known shipping is included in the comparable total", "Unknown shipping remains visibly unknown", "Malformed or unsafe listings are rejected"] },
  { number: "03", title: "Trust evidence", short: "Facts, not decorative scores.", copy: "Confidence reflects the evidence available for the product match, condition, seller, shipping, and available return terms. Missing facts lower confidence instead of being invented.", evidence: ["HIGH, MEDIUM, or LOW confidence with explicit reasons", "Missing seller evidence cannot strengthen a recommendation", "Retailer terms appear only when supplied by the provider"] },
  { number: "04", title: "Price anomaly", short: "Too cheap deserves scrutiny.", copy: "A listing dramatically below the cluster of otherwise comparable offers is treated as suspicious. It cannot become Our Pick or enter price history until stronger evidence supports it.", evidence: ["Anomalies are measured against validated comparable offers", "Suspicious prices are blocked from recommendation", "Rejected prices do not contaminate historical intelligence"] },
  { number: "05", title: "Our Pick", short: "Best-supported, not merely cheapest.", copy: "Kelus weighs known total, match confidence, seller evidence, shipping, and available return facts. When a cheaper option passes validation, the product page explains the factual trade-off.", evidence: ["LOW-confidence offers cannot become Our Pick", "Cheapest and recommended can be different", "Every explanation is generated from available evidence"] },
];

export function MethodologyPanels() {
  const [active, setActive] = useState(0);
  return <div className="method-panels" aria-label="Kelus recommendation methodology">
    {panels.map((panel, index) => {
      const open = active === index;
      return <article className={`method-panel${open ? " is-active" : ""}`} key={panel.title}>
        <button type="button" aria-expanded={open} onClick={() => setActive(index)}>
          <span>{panel.number}</span><strong>{panel.title}</strong><small>{panel.short}</small><i aria-hidden="true">{open ? "−" : "+"}</i>
        </button>
        <div className="method-panel-detail" aria-hidden={!open}>
          <p>{panel.copy}</p>
          <ul>{panel.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </article>;
    })}
  </div>;
}
