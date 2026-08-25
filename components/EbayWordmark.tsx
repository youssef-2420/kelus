export function EbayWordmark({ compact = false }: { compact?: boolean }) {
  return <span className={`ebay-wordmark${compact ? " is-compact" : ""}`} role="img" aria-label="eBay">
    <span className="ebay-letter ebay-letter-e">e</span>
    <span className="ebay-letter ebay-letter-b">b</span>
    <span className="ebay-letter ebay-letter-a">a</span>
    <span className="ebay-letter ebay-letter-y">y</span>
  </span>;
}
