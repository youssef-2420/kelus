import { Icon } from "@/components/Icon";
import { ProductListingCard } from "@/components/ProductListingCard";
import { SafeLink as Link } from "@/components/SafeLink";
import { listHomeComparisonPreviews } from "@/lib/bundled-snapshot-catalog";

export function HomeLearnSection() {
  const previews = listHomeComparisonPreviews(4);

  return (
    <section className="home-learn section" aria-labelledby="home-browse-heading">
      <div className="home-learn-head">
        <div>
          <h2 id="home-browse-heading">Open a comparison</h2>
          <p>See the current pick and the cheaper offers it beat.</p>
        </div>
        <Link className="home-learn-link" href="/products">
          All products <Icon name="arrow" size={14} />
        </Link>
      </div>
      <div className="home-learn-grid is-browse">
        {previews.map((preview) => (
          <ProductListingCard key={`${preview.productSlug}-${preview.href}`} preview={preview} layout="tile" showStatus={false} />
        ))}
      </div>
    </section>
  );
}
