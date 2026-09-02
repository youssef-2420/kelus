/* eslint-disable @next/next/no-img-element */

import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SafeLink as Link } from "@/components/SafeLink";
import { formatFromPrice, getComparisonDemo, type ComparisonDemoRow } from "@/lib/bundled-snapshot-catalog";
import { optimizedRetailerImageUrl } from "@/services/retailer-image";

type Props = {
  compact?: boolean;
  layout?: "default" | "desk";
};

function formatMoney(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: fractionDigits }).format(value);
}

function Row({ row, compact }: { row: ComparisonDemoRow; compact?: boolean }) {
  const badge = row.role === "pick" ? "Our pick" : row.role === "cheapest" ? "Cheapest" : null;
  return (
    <div className={`comparison-row is-${row.role}${compact ? " is-compact" : ""}`} role="listitem">
      <div className="comparison-row-main">
        <span className="comparison-row-seller">
          {badge ? <span className={`comparison-row-badge is-${row.role}`}>{badge}</span> : null}
          {row.seller}
        </span>
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

function StageImage({ imageUrl, label, large = false }: { imageUrl?: string; label: string; large?: boolean }) {
  const source = optimizedRetailerImageUrl(imageUrl, large ? 220 : 96);
  if (!source) return <ProductMark label={label} />;
  return <img src={source} alt="" width={large ? 160 : 56} height={large ? 160 : 56} loading="lazy" decoding="async" />;
}

function DeskPick({ demo }: { demo: NonNullable<ReturnType<typeof getComparisonDemo>> }) {
  const pick = demo.rows.find((row) => row.role === "pick");
  const cheapest = demo.rows.find((row) => row.role === "cheapest");
  const savingsLabel = demo.savingsGap !== null && demo.savingsGap > 0
    ? `${formatMoney(demo.savingsGap)} cheaper listing failed validation`
    : null;

  return (
    <aside className="desk-pick" aria-label="Live Kelus pick">
      <p className="desk-pick-kicker">Live Kelus pick</p>
      <div className="desk-pick-product">
        <span className="desk-pick-thumb" aria-hidden="true">
          <StageImage imageUrl={demo.listingImageUrl} label={demo.productName.slice(0, 2).toUpperCase()} large />
        </span>
        <div>
          <p className="desk-pick-brand">{demo.brand}</p>
          <h2 className="desk-pick-title">{demo.productName}</h2>
          <p className="desk-pick-meta">{demo.variantLabel} · {demo.offerCount} validated offers</p>
        </div>
      </div>
      <div className="desk-pick-totals">
        <div className="desk-pick-total is-pick">
          <span>Our pick · known total</span>
          <strong>{demo.pickTotal !== null ? formatMoney(demo.pickTotal) : "—"}</strong>
          {pick ? <em>{pick.seller}</em> : null}
        </div>
        {cheapest && cheapest.knownTotal !== null ? (
          <div className="desk-pick-total is-cheapest">
            <span>Cheapest listing</span>
            <strong>{formatMoney(cheapest.knownTotal)}</strong>
            <em>{cheapest.seller}</em>
          </div>
        ) : null}
      </div>
      {savingsLabel ? <p className="desk-pick-note">{savingsLabel}</p> : null}
      <div className="desk-pick-foot">{comparisonFootnote(demo)}</div>
      <Link className="button button-primary desk-pick-cta" href={demo.href}>
        Open this comparison <Icon name="arrow" size={17} />
      </Link>
    </aside>
  );
}

export function ComparisonStage({ compact = false, layout = "default" }: Props) {
  const demo = getComparisonDemo();
  if (!demo) return null;
  if (layout === "desk") return <DeskPick demo={demo} />;

  const savingsLabel = demo.savingsGap !== null && demo.savingsGap > 0
    ? `${formatMoney(demo.savingsGap)} cheaper listing failed validation`
    : null;
  return (
    <aside className={`comparison-stage${compact ? " is-compact" : ""}`} aria-label="Live comparison example">
      <header className="comparison-stage-head">
        <div className="comparison-stage-intro">
          <span className="comparison-stage-thumb" aria-hidden="true">
            <StageImage imageUrl={demo.listingImageUrl} label={demo.productName.slice(0, 2).toUpperCase()} />
          </span>
          <div>
            <p className="comparison-stage-label">Live example</p>
            <p className="comparison-stage-product">{demo.brand} {demo.productName}</p>
            <p className="comparison-stage-variant">{demo.variantLabel} · {demo.offerCount} validated offers</p>
            {savingsLabel ? <p className="comparison-stage-savings">{savingsLabel}</p> : null}
          </div>
        </div>
        <Link className="comparison-stage-open" href={demo.href}>
          Open comparison <Icon name="arrow" size={14} />
        </Link>
      </header>
      <div className="comparison-stage-rows" role="list">
        {demo.rows.map((row) => <Row key={row.id} row={row} compact={compact} />)}
      </div>
      <footer className="comparison-stage-foot">
        {comparisonFootnote(demo)}
      </footer>
    </aside>
  );
}
