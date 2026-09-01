import type { Product, ProductVariant } from "@/types/kelus";
import type { SeoIndexedCondition } from "@/lib/catalog-snapshot-targets";

type ProductSeoIntroProps = {
  product: Product;
  variant: ProductVariant;
  condition: SeoIndexedCondition;
  hasLiveSnapshot?: boolean;
};

function conditionCopy(condition: SeoIndexedCondition) {
  return condition === "new"
    ? "new and sealed listings"
    : "used and pre-owned listings";
}

export function ProductSeoIntro({ product, variant, condition, hasLiveSnapshot = false }: ProductSeoIntroProps) {
  const conditionLabel = condition === "new" ? "New" : "Used";
  return (
    <section className="product-seo-intro section" aria-label="Product overview">
      <p className="product-seo-kicker">{product.brand} · {product.category}</p>
      <h1 className="product-seo-title">{product.name} {variant.label} — {conditionLabel} prices</h1>
      <p className="product-seo-lead">
        {hasLiveSnapshot
          ? `Kelus compares validated live eBay offers for the ${product.brand} ${product.name} (${variant.label}) in ${conditionCopy(condition)}. Each listing is checked for product match, seller trust, shipping, and return policy so you can see which offer is actually worth buying.`
          : `Kelus checks matching eBay listings for the ${product.brand} ${product.name} (${variant.label}) in ${conditionCopy(condition)}. When validated offers are available, Kelus compares product match, seller trust, shipping, and return policy before recommending one.`}
      </p>
    </section>
  );
}
