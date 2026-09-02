import { Icon } from "@/components/Icon";
import { ProductListingCard } from "@/components/ProductListingCard";
import { SafeLink as Link } from "@/components/SafeLink";
import { listHomeComparisonPreviews } from "@/lib/bundled-snapshot-catalog";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";

export function HomeLearnSection() {
  const previews = listHomeComparisonPreviews(8);

  return (
    <section className="home-learn section" aria-labelledby="home-browse-heading">
      <div className="home-learn-head">
        <div>
          <h2 id="home-browse-heading">Open a comparison</h2>
          <p>Validated setups with known totals. See why cheaper listings were passed over before you buy.</p>
        </div>
        <Link className="home-learn-link" href="/products">
          All products <Icon name="arrow" size={14} />
        </Link>
      </div>
      <nav className="home-learn-categories" aria-label="Browse categories">
        {categoryHubs.map((hub) => (
          <Link key={hub.slug} href={categoryHubPath(hub.slug)}>{hub.label}</Link>
        ))}
      </nav>
      <div className="home-learn-grid is-browse">
        {previews.map((preview) => (
          <ProductListingCard key={`${preview.productSlug}-${preview.href}`} preview={preview} layout="tile" />
        ))}
      </div>
      <p className="home-learn-foot">
        <Link href="/how-it-works">How Kelus works</Link>
        <Link href="/methodology">How Kelus picks</Link>
        <Link href="/coverage">What Kelus covers</Link>
      </p>
    </section>
  );
}
