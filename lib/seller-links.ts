export function ebaySellerProfileUrl(sellerName: string | null | undefined) {
  const name = sellerName?.trim();
  if (!name) return null;
  return `https://www.ebay.com/usr/${encodeURIComponent(name)}`;
}
