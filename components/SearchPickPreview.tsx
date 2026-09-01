import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { formatFromPrice, listBundledShowcases } from "@/lib/bundled-snapshot-catalog";

export function SearchPickPreview() {
  const [example] = listBundledShowcases(1);
  if (!example) return null;
  return (
    <aside className="search-pick-preview" aria-label="Example Kelus comparison">
      <div className="search-pick-preview-card">
        <p className="search-pick-preview-label">What you&apos;ll see</p>
        <div className="search-pick-preview-body">
          <span className="search-pick-preview-kicker">Our Pick · {example.brand}</span>
          <strong>{example.productName} {example.variantLabel}</strong>
          <p>Known total from <em>{formatFromPrice(example.pickPrice ?? example.fromPrice)}</em> · {example.offerCount} validated offer{example.offerCount === 1 ? "" : "s"}</p>
          <Link href={example.href}>Open live comparison <Icon name="arrow" size={14} /></Link>
        </div>
      </div>
    </aside>
  );
}
