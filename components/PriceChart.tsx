import type { PricePoint } from "@/types/kelus";

export function PriceChart({ points }: { points: PricePoint[] }) {
  const low = Math.min(...points.map((point) => point.price));
  const high = Math.max(...points.map((point) => point.price));
  const path = points.map((point, index) => {
    const x = 6 + index * (88 / (points.length - 1));
    const y = 10 + ((high - point.price) / Math.max(high - low, 1)) * 62;
    return (index === 0 ? "M" : "L") + x + " " + y;
  }).join(" ");
  return <div className="chart" aria-label="Price history chart">
    <svg viewBox="0 0 100 88" preserveAspectRatio="none" role="img" aria-label="Prices declined from 899 dollars to 799 dollars">
      <defs><linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#2f8277" stopOpacity=".28"/><stop offset="1" stopColor="#2f8277" stopOpacity="0"/></linearGradient></defs>
      <path className="chart-grid" d="M0 15H100M0 40H100M0 65H100" />
      <path d={path + " L94 78 L6 78 Z"} fill="url(#price-fill)" />
      <path d={path} className="chart-line" />
      {points.map((point, index) => <circle key={point.label} cx={6 + index * (88 / (points.length - 1))} cy={10 + ((high - point.price) / Math.max(high - low, 1)) * 62} r="1.5" className="chart-dot" />)}
    </svg>
    <div className="chart-labels">{points.map((point) => <span key={point.label}>{point.label}</span>)}</div>
  </div>;
}
