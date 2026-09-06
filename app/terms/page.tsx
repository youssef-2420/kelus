import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms — Kelus",
  description: "Terms for using Kelus, the local-first exam planner on kelus.me.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main id="main" className="legal-page">
      <article className="legal-panel">
        <p className="kicker">Legal</p>
        <h1>Terms of use</h1>
        <p className="legal-updated">Last updated: September 6, 2026</p>
        <p className="legal-lede">By using kelus.me, you agree to these terms.</p>

        <h2>What Kelus provides</h2>
        <p>
          Kelus helps you turn course materials into a focused daily study route. Recommendations are guidance for
          exam prep — not grades, academic credit, medical advice, or a guarantee of exam outcomes.
        </p>

        <h2>Your materials and responsibility</h2>
        <ul>
          <li>Only upload files you have the right to use for personal study.</li>
          <li>You are responsible for verifying concepts against your official syllabus and instructors.</li>
          <li>Do not misuse Kelus automation, accounts, or infrastructure.</li>
        </ul>

        <h2>Accounts and waitlist</h2>
        <p>
          If you create an account or join the waitlist, keep your credentials safe and provide an email you control.
          We may remove abusive accounts or waitlist entries.
        </p>

        <h2>Availability</h2>
        <p>
          Kelus is provided as-is. Features may change as the product evolves. Local browser storage can be cleared by
          you or by the browser; keep your own backups of critical notes.
        </p>

        <h2>Limitation</h2>
        <p>
          To the fullest extent allowed by law, Kelus is not liable for study outcomes, missed exams, data loss on your
          device, or third-party service interruptions (including auth or analytics providers).
        </p>

        <h2>Changes</h2>
        <p>We may update these terms. Continued use after changes means you accept the revised terms.</p>

        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:hello@kelus.me">hello@kelus.me</a>
          {" · "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </article>
      <SiteFooter compact />
    </main>
  );
}
