import { Icon } from "@/components/Icon";
import { formatFromPrice, listBundledShowcases } from "@/lib/bundled-snapshot-catalog";

export function TrustRow() {
  const live = listBundledShowcases(1)[0];
  return <div className="trust-row">
    <span><Icon name="history"/>{live ? `Live from ${formatFromPrice(live.fromPrice)}` : "Live prices"}</span>
    <span><Icon name="shield"/>Trusted offers</span>
    <span><Icon name="tag"/>Price context</span>
    <span><Icon name="search"/>Independent picks</span>
  </div>;
}
