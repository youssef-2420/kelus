import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { formatFromPrice, getComparisonDemo, type ComparisonDemoRow } from "@/lib/bundled-snapshot-catalog";

type Props = {
  compact?: boolean;
};

function formatMoney(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: fractionDigits }).format(value);
}

function Row({ row, compact }: { row: ComparisonDemoRow; compact?: boolean }) {
  return (
    <div className={`comparison-row is-${row.role}${compact ? " is-compact" : ""}`}>
      <div className="comparison-row-main">
        <span className="comparison-row-seller">{row.seller}</span>
        <span className="comparison-row-meta">
          {formatMoney(row.listPrice)} listing
          {row.shippingKnown ? ` + ${formatMoney(row.shipping ?? 0)} ship` : " · shipping unknown"}
        </span>
      </div>
      <div className="comparison-row-total">
        {row.knownTotal !== null ? (
          <strong>{formatMoney(row.knownTotal)}</strong>
        ) : (
          <strong className="is-unknown">—</strong>
        )}
        {row.role === "pick" ? <em>Our Pick</em> : row.role === "cheapest" ? <em>Cheapest</em> : null}
      </div>
      {row.note ? <p className="comparison-row-note">{row.note}</p> : null}
    </div>
  );
}

function comparisonFootnote(demo: NonNullable<ReturnType<typeof getComparisonDemo>>) {
  if (demo.savingsGap !== null && demo.savingsGap > 0 && demo.cheapestTotal !== null && demo.pickTotal !== null) {
    const skipped = demo.cheaperOfferCount;
    const skippedCopy = skipped > 1
      ? `Kelus passed over ${skipped} cheaper listings`
      : "Kelus passed over the cheapest listing";
    return (
      <p>
        {skippedCopy} — the lowest known total was <strong>{formatMoney(demo.cheapestTotal)}</strong>.
        {" "}Our Pick cleared seller and match checks at <strong>{formatMoney(demo.pickTotal)}</strong>.
      </p>
    );
  }
  if (demo.pickTotal !== null) {
    return <p>Known total from <strong>{formatFromPrice(demo.pickTotal)}</strong> after shipping is included.</p>;
  }
  return <p>Kelus surfaces known totals before you commit to a listing.</p>;
}

export function ComparisonStage({ compact = false }: Props) {
  const demo = getComparisonDemo();
  if (!demo) return null;
  return (
    <aside className={`comparison-stage${compact ? " is-compact" : ""}`} aria-label="Live comparison example">
      <header className="comparison-stage-head">
        <div>
          <p className="comparison-stage-label">Live example</p>
          <p className="comparison-stage-product">{demo.brand} {demo.productName}</p>
          <p className="comparison-stage-variant">{demo.variantLabel} · {demo.offerCount} validated offers</p>
        </div>
        <Link className="comparison-stage-open" href={demo.href}>
          Open comparison <Icon name="arrow" size={14} />
        </Link>
      </header>
      <div className="comparison-stage-rows">
        {demo.rows.map((row) => <Row key={row.id} row={row} compact={compact} />)}
      </div>
      <footer className="comparison-stage-foot">
        {comparisonFootnote(demo)}
      </footer>
    </aside>
  );
}
