import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of use — Kelus",
  description: "Terms for using Kelus shopping intelligence and eBay offer comparisons on kelus.me.",
  alternates: { canonical: "https://kelus.me/terms" },
};

export default function TermsPage() {
  return (
    <main className="app-page">
      <KelusHeader />
      <section className="legal-page">
        <p className="eyebrow">Legal</p>
        <h1>Terms of use</h1>
        <p>Last updated: September 1, 2026</p>
        <p>By using kelus.me, you agree to these terms.</p>

        <h2>What Kelus provides</h2>
        <p>Kelus compares publicly available eBay listings and explains how offers were evaluated. Recommendations are informational — not financial, legal, or purchase advice.</p>

        <h2>Accuracy and availability</h2>
        <p>Prices, shipping, seller details, and stock change frequently. A saved comparison may be newer or older than live listings. Always confirm the final total on eBay before buying.</p>

        <h2>Affiliate and outbound links</h2>
        <p>Outbound retailer links may use affiliate parameters where supported. That does not change how Kelus ranks offers within a comparison.</p>

        <h2>Accounts and alerts</h2>
        <p>You are responsible for activity under your account. Do not misuse alerts, automation, or Kelus infrastructure.</p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not scrape, overload, or attempt to bypass rate limits.</li>
          <li>Do not misrepresent Kelus output as a guarantee of price or seller quality.</li>
          <li>Do not use Kelus for unlawful purposes.</li>
        </ul>

        <h2>Disclaimer</h2>
        <p>Kelus is provided &quot;as is&quot; without warranties. We are not liable for purchase outcomes, listing errors, or third-party marketplace changes.</p>

        <h2>Changes</h2>
        <p>We may update these terms. Continued use after changes means you accept the revised terms.</p>

        <h2>Contact</h2>
        <p>Questions: <a href="mailto:hello@kelus.me">hello@kelus.me</a></p>
      </section>
      <SiteFooter />
    </main>
  );
}
