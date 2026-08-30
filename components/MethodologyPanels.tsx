"use client";

import { useState } from "react";

const panels = [
  { number: "01", title: "Exact match", line: "Right product. Right configuration.", detail: "Kelus rejects wrong models, variants, accessories, parts, and incompatible conditions before comparing price.", mark: "MATCH" },
  { number: "02", title: "Known total", line: "Price plus known shipping.", detail: "Unknown shipping stays unknown. Kelus never labels a missing charge as free or estimates the total.", mark: "TOTAL" },
  { number: "03", title: "Trust evidence", line: "Confidence must have evidence.", detail: "Seller and available retailer facts strengthen a recommendation; missing information never does.", mark: "TRUST" },
  { number: "04", title: "Price anomaly", line: "Too cheap deserves scrutiny.", detail: "Suspicious outliers are blocked from Our Pick and price history until stronger evidence supports them.", mark: "CHECK" },
  { number: "05", title: "Our Pick", line: "Best-supported, not merely cheapest.", detail: "Kelus weighs known total and trust evidence, then explains any meaningful cheaper trade-off.", mark: "PICK" },
];

export function MethodologyPanels() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const select = (index: number, nextDirection: "forward" | "back") => { setDirection(nextDirection); setActive(index); };
  const move = (step: number) => select((active + step + panels.length) % panels.length, step > 0 ? "forward" : "back");
  const panel = panels[active];
  return <div className={`method-carousel is-${direction}`}>
    <div className="method-carousel-controls" aria-label="Methodology carousel controls"><button type="button" onClick={() => move(-1)} aria-label="Previous methodology step">←</button><button type="button" onClick={() => move(1)} aria-label="Next methodology step">→</button></div>
    <div className="method-carousel-track">
      <article className={`method-feature method-tone-${active + 1}`} aria-live="polite" key={`feature-${active}`}><span>{panel.number} / 05</span><div className="method-feature-mark" aria-hidden="true">{panel.mark}</div><h3>{panel.title}</h3></article>
      <div className="method-previews" aria-label="Choose a methodology step">{panels.map((item, index) => <button className={`method-preview method-tone-${index + 1}${index === active ? " is-active" : ""}`} type="button" onClick={() => select(index, index >= active ? "forward" : "back")} aria-label={`Show ${item.title}`} aria-current={index === active ? "step" : undefined} key={item.title}><span>{item.number}</span><strong>{item.title}</strong></button>)}</div>
    </div>
    <div className="method-carousel-copy" key={`copy-${active}`}><h4>{panel.line}</h4><p>{panel.detail}</p></div>
  </div>;
}
