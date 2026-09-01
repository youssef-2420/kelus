import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { formatFromPrice, listBundledShowcases } from "@/lib/bundled-snapshot-catalog";

function freshnessLabel(lastUpdated?: string) {
  if (!lastUpdated || Number.isNaN(Date.parse(lastUpdated))) return "Saved comparison";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(lastUpdated)) / 60_000));
  if (minutes < 60) return `Updated ${minutes || 1} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  return "Saved comparison";
}

export function LiveShowcase({ compact = false }: { compact?: boolean }) {
  const showcases = listBundledShowcases(compact ? 3 : 4);
  if (!showcases.length) return null;
  if (compact && showcases.length === 1) {
    const item = showcases[0];
    return (
      <p className="live-showcase-inline">
        <span className="eyebrow">Live example</span>
        <Link href={item.href}>
          {item.brand} {item.productName} {item.variantLabel} from {formatFromPrice(item.fromPrice)}
          <Icon name="arrow" size={14} />
        </Link>
      </p>
    );
  }
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
            <em>{item.offerCount} validated offer{item.offerCount === 1 ? "" : "s"} · {freshnessLabel(item.lastUpdated)}</em>
            <span className="live-showcase-cta">See Kelus pick <Icon name="arrow" size={14}/></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
