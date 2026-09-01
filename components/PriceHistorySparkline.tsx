import { PriceChart } from "@/components/PriceChart";
import type { PricePoint } from "@/types/kelus";

type Props = {
  points: PricePoint[];
  title?: string;
  detail?: string;
  compact?: boolean;
};

export function PriceHistorySparkline({ points, title = "Recent price trend", detail, compact = false }: Props) {
  if (points.length < 2) {
    return <div className={`price-history-sparkline is-building${compact ? " is-compact" : ""}`}>
      <p className="pi-label">{title}</p>
      <p>{detail ?? "Kelus is collecting real observations for this exact configuration. Track it to help history build faster."}</p>
      <div className="price-history-sparkline-placeholder" aria-hidden="true"><span/><span/><span/><span/><span/></div>
    </div>;
  }
  return <div className={`price-history-sparkline${compact ? " is-compact" : ""}`}>
    <p className="pi-label">{title}</p>
    {detail ? <p className="price-history-sparkline-detail">{detail}</p> : null}
    <PriceChart points={points} />
  </div>;
}
