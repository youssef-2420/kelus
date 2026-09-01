import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

export function SearchLauncher() {
  return (
    <div className="hero-search-wrap">
      <Link href="/search" className="hero-search-launcher" aria-label="Open product search">
        <span className="hero-search-launcher-category" aria-hidden="true">All</span>
        <span className="hero-search-launcher-copy">Search iPhone, MacBook, headphones…</span>
        <span className="hero-search-launcher-action" aria-hidden="true"><Icon name="search" size={20} /></span>
      </Link>
    </div>
  );
}
