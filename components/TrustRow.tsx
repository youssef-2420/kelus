import { Icon } from "@/components/Icon";

export function TrustRow() {
  return <div className="trust-row">
    <span><Icon name="history"/>Checked every 15 min</span>
    <span><Icon name="shield"/>Trusted offers</span>
    <span><Icon name="tag"/>Price context</span>
    <span><Icon name="search"/>Independent picks</span>
  </div>;
}
