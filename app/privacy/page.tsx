import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy policy — Kelus",
  description: "How Kelus handles account data, price alerts, and analytics when you use kelus.me.",
  alternates: { canonical: "https://kelus.me/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="app-page">
      <KelusHeader />
      <section className="legal-page">
        <p className="eyebrow">Legal</p>
        <h1>Privacy policy</h1>
        <p>Last updated: September 1, 2026</p>
        <p>Kelus is an independent shopping intelligence site. This policy explains what we collect and why.</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account information</strong> — If you sign in, we store your email and authentication identifiers through our auth provider.</li>
          <li><strong>Price alerts</strong> — Product, configuration, target price, and alert status you choose to save.</li>
          <li><strong>Usage analytics</strong> — Aggregated page views and events via Google Analytics to understand how Kelus is used.</li>
          <li><strong>Technical logs</strong> — Standard server logs for reliability, abuse prevention, and debugging.</li>
        </ul>

        <h2>What we do not sell</h2>
        <p>We do not sell your personal information. Kelus does not run third-party ad auctions on product pages.</p>

        <h2>How we use data</h2>
        <ul>
          <li>Provide search, comparisons, and saved price alerts.</li>
          <li>Improve product coverage, reliability, and performance.</li>
          <li>Respond to support or security issues.</li>
        </ul>

        <h2>Third parties</h2>
        <p>Kelus links to eBay listings. When you click through, eBay&apos;s policies apply. Authentication and database hosting may use Supabase. Analytics uses Google Analytics.</p>

        <h2>Your choices</h2>
        <p>You can delete saved alerts from My Alerts. To remove your account, contact us at <a href="mailto:hello@kelus.me">hello@kelus.me</a>.</p>

        <h2>Contact</h2>
        <p>Questions about privacy: <a href="mailto:hello@kelus.me">hello@kelus.me</a></p>
      </section>
      <SiteFooter />
    </main>
  );
}
