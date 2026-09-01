import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { formatFromPrice, listBundledShowcases } from "@/lib/bundled-snapshot-catalog";

function freshnessLabel(lastUpdated?: string) {
  if (!lastUpdated || Number.isNaN(Date.parse(lastUpdated))) return "Saved comparison";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(lastUpdated)) / 60_000));
  if (minutes < 60) return `Updated ${minutes || 1} min ago`;
  return "Updated recently";
}

export function LiveShowcase({ compact = false }: { compact?: boolean }) {
  const showcases = listBundledShowcases(compact ? 3 : 4);
  if (!showcases.length) return null;
  return (
    <section className={`live-showcase${compact ? " is-compact" : ""}`} aria-label="Live comparisons on Kelus">
      <div className="live-showcase-heading">
        <p className="eyebrow">Live on Kelus now</p>
        {!compact && <p className="live-showcase-copy">Real validated eBay comparisons you can open right now.</p>}
      </div>
      <div className="live-showcase-grid">
        {showcases.map((item) => (
          <Link key={item.href} className="live-showcase-card" href={item.href}>
            <span className="live-showcase-kicker">{item.brand} · {item.condition === "new" ? "New" : item.condition === "used" ? "Used" : item.condition}</span>
            <strong>{item.productName}</strong>
            <small>{item.variantLabel}</small>
            <span className="live-showcase-price">From {formatFromPrice(item.fromPrice)}</span>
            {item.pickPrice && item.pickPrice !== item.fromPrice ? <span className="live-showcase-pick">Kelus pick {formatFromPrice(item.pickPrice)}</span> : null}
            <em>{item.offerCount} validated offer{item.offerCount === 1 ? "" : "s"} · {freshnessLabel(item.lastUpdated)}</em>
            <span className="live-showcase-cta">See Kelus pick <Icon name="arrow" size={14}/></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
