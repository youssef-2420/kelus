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

function formatConditionLabel(condition: string) {
  if (condition === "any") return "Any condition";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function formatSnapshotLabel(lastUpdated?: string) {
  if (!lastUpdated) return "Saved example";
  const date = new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return "Saved example";
  return `Saved example · ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatSellerEvidence(row: ComparisonDemoRow) {
  if (typeof row.feedbackPercentage !== "number" || typeof row.feedbackScore !== "number") return null;
  const score = row.feedbackScore >= 1000
    ? `${(row.feedbackScore / 1000).toFixed(row.feedbackScore >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`
    : String(row.feedbackScore);
  return `${row.feedbackPercentage}% · ${score} feedback`;
}

function Row({ row, compact, quiet = false }: { row: ComparisonDemoRow; compact?: boolean; quiet?: boolean }) {
  const badge = row.role === "pick" ? "Our pick" : row.role === "cheapest" ? "Cheapest" : null;
  const evidence = quiet ? null : formatSellerEvidence(row);
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
          {evidence ? ` · ${evidence}` : ""}
        </span>
      </div>
      <div className="comparison-row-total">
        {row.knownTotal !== null ? (
          <strong>{formatMoney(row.knownTotal)}</strong>
        ) : (
          <strong className="is-unknown">—</strong>
        )}
        {!quiet ? row.role === "pick" ? <em>Our Pick</em> : row.role === "cheapest" ? <em>Cheapest</em> : <em>Skipped</em> : null}
      </div>
      {!quiet && row.note ? <p className="comparison-row-note">{row.note}</p> : null}
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
  const conciseReason = demo.pickReasons.find((reason) => !/total including shipping/i.test(reason)) ?? demo.pickReasons[0];
  return (
    <aside className="desk-pick" aria-label="Example Kelus pick">
      <p className="desk-pick-status">{formatSnapshotLabel(demo.lastUpdated)}</p>
      <div className="desk-pick-product">
        <span className="desk-pick-thumb" aria-hidden="true">
          <StageImage imageUrl={demo.listingImageUrl} label={demo.productName.slice(0, 2).toUpperCase()} large />
        </span>
        <div>
          <p className="desk-pick-brand">{demo.brand}</p>
          <h2 className="desk-pick-title">{demo.productName}</h2>
          <p className="desk-pick-meta">
            {demo.variantLabel} · {formatConditionLabel(demo.condition)} · {demo.offerCount} listings in this example
          </p>
        </div>
      </div>
      <p className="desk-pick-verdict">Not the cheapest. The offer that passed.</p>
      {demo.savingsGap !== null && demo.savingsGap > 0 && demo.cheapestTotal !== null ? (
        <p className="desk-pick-gap">
          Cheapest known total was <strong>{formatMoney(demo.cheapestTotal)}</strong>
          {" "}— <strong>{formatMoney(demo.savingsGap)}</strong> less, but it did not clear checks.
        </p>
      ) : null}
      <div className="desk-pick-rows comparison-stage-rows" role="list">
        {demo.rows.filter((row) => row.role === "cheapest" || row.role === "pick").map((row) => <Row key={row.id} row={row} compact quiet />)}
      </div>
      {conciseReason ? (
        <ul className="desk-pick-reasons">
          <li>{conciseReason}</li>
        </ul>
      ) : null}
      <Link className="button button-secondary desk-pick-cta" href={demo.href}>
        View this example <Icon name="arrow" size={17} />
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
    <aside className={`comparison-stage${compact ? " is-compact" : ""}`} aria-label="Example comparison">
      <header className="comparison-stage-head">
        <div className="comparison-stage-intro">
          <span className="comparison-stage-thumb" aria-hidden="true">
            <StageImage imageUrl={demo.listingImageUrl} label={demo.productName.slice(0, 2).toUpperCase()} />
          </span>
          <div>
            <p className="comparison-stage-label">Example comparison</p>
            <p className="comparison-stage-product">{demo.brand} {demo.productName}</p>
            <p className="comparison-stage-variant">
              {demo.variantLabel} · {formatConditionLabel(demo.condition)} · {demo.offerCount} listings in this example
            </p>
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
