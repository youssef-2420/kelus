import { Icon } from "@/components/Icon";
import Link from "next/link";

export function KelusHeader() {
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="Kelus home">kelus</Link>
    <nav aria-label="Main navigation">
      <a href="/results">Compare</a><a href="/product/iphone-17">How it works</a><a href="/saved">My alerts</a>
    </nav>
    <a className="header-signin" href="/saved"><Icon name="bell" size={17} /> Alerts</a>
  </header>;
}
