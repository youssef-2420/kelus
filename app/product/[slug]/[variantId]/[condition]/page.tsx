import { redirect } from "next/navigation";
import { products } from "@/lib/demo-data";
import { canonicalProductPath, readCanonicalProductCriteria } from "@/lib/search-state";
import { CONDITIONS } from "@/types/kelus";

type RouteParams = { slug: string; variantId: string; condition: string };
type PageProps = { params: Promise<RouteParams> };

export function generateStaticParams(): RouteParams[] {
  return products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) =>
    CONDITIONS.map((condition) => ({ slug: product.slug, variantId, condition })),
  ));
}

export default async function LegacyCanonicalProductPage({ params }: PageProps) {
  const { slug, variantId, condition } = await params;
  const criteria = readCanonicalProductCriteria(slug, variantId, condition);
  if (!criteria) redirect("/");
  redirect(canonicalProductPath(criteria));
}
