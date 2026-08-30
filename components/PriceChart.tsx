import type { PricePoint } from "@/types/kelus";

export function PriceChart({ points }: { points: PricePoint[] }) {
  if (!points.length) {
    return <div className="chart" role="status">Price history is not available yet.</div>;
  }

  const low = Math.min(...points.map((point) => point.price));
  const high = Math.max(...points.map((point) => point.price));
  const xFor = (index: number) => 6 + index * (88 / Math.max(points.length - 1, 1));
  const yFor = (price: number) => 10 + ((high - price) / Math.max(high - low, 1)) * 62;
  const path = points.map((point, index) => {
    const x = xFor(index);
    const y = yFor(point.price);
    return (index === 0 ? "M" : "L") + x + " " + y;
  }).join(" ");
  const description = points.length === 1
    ? `One recorded price of ${points[0].price} dollars`
    : `Prices changed from ${points[0].price} dollars to ${points.at(-1)!.price} dollars`;
  return <div className="chart" aria-label="Price history chart">
    <svg viewBox="0 0 100 88" preserveAspectRatio="none" role="img" aria-label={description}>
      <defs><linearGradient id="price-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#2f8277" stopOpacity=".28"/><stop offset="1" stopColor="#2f8277" stopOpacity="0"/></linearGradient></defs>
      <path className="chart-grid" d="M0 15H100M0 40H100M0 65H100" />
      <path d={path + " L94 78 L6 78 Z"} fill="url(#price-fill)" />
      <path d={path} className="chart-line" />
      {points.map((point, index) => <circle key={point.label} cx={xFor(index)} cy={yFor(point.price)} r="1.5" className="chart-dot" />)}
    </svg>
    <div className="chart-labels">{points.map((point) => <span key={point.label}>{point.label}</span>)}</div>
  </div>;
}
