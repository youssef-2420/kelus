import { categoryHubs } from "@/lib/category-routes";
import { SafeLink as Link } from "@/components/SafeLink";

export function SiteFooter() {
  return (
    <footer className="site-footer section">
      <div className="site-footer-grid">
        <div>
          <Link className="wordmark" href="/">kelus</Link>
          <p>Independent shopping intelligence for exact electronics configurations on eBay.</p>
        </div>
        <div>
          <p className="site-footer-label">Browse</p>
          <Link href="/search">Search</Link>
          <Link href="/coverage">What Kelus covers</Link>
          {categoryHubs.map((hub) => (
            <Link key={hub.slug} href={`/category/${hub.slug}`}>{hub.label}</Link>
          ))}
        </div>
        <div>
          <p className="site-footer-label">Trust</p>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/alerts">Price alerts</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <p className="site-footer-note">Kelus compares matching eBay listings. Prices and availability change frequently.</p>
    </footer>
  );
}
