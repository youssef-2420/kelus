import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms — Kelus",
  description: "Terms for using Kelus, the local-first revision and exam practice tool on kelus.me.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main id="main" className="legal-page">
      <article className="legal-panel">
        <p className="kicker">Legal</p>
        <h1>Terms of use</h1>
        <p className="legal-updated">Last updated: September 9, 2026</p>
        <p className="legal-lede">By using kelus.me, you agree to these terms.</p>

        <h2>What Kelus provides</h2>
        <p>
          Kelus helps you revise course materials through recall and application practice. Recommendations are guidance for
          exam prep — not grades, academic credit, medical advice, or a guarantee of exam outcomes.
        </p>

        <h2>Exam Pass</h2>
        <p>
          Exam Pass is a one-time purchase for one exam date you set in Kelus. It unlocks the remaining-day plan view,
          a calendar file for those days, and a printable topic list on the browser that completes a verified redeem
          (Stripe checkout session or a code we issue). It does not guarantee grades, coverage of every topic if your
          daily minutes are too low, or that OCR will extract every syllabus perfectly.
        </p>
        <ul>
          <li>Today’s revision route stays available without Exam Pass.</li>
          <li>Unlock is bound to the browser via a secure cookie after verification — not a public query flag.</li>
          <li>If you pay and cannot unlock, email hello@kelus.me with your receipt within 14 days for help or a refund.</li>
          <li>Changing your exam date does not automatically create a second paid plan; contact us if you need a reset.</li>
        </ul>

        <h2>Your materials and responsibility</h2>
        <ul>
          <li>Only upload files you have the right to use for personal study.</li>
          <li>You are responsible for verifying concepts against your official syllabus and instructors.</li>
          <li>Do not misuse Kelus automation, accounts, or infrastructure.</li>
        </ul>

        <h2>Accounts and waitlist</h2>
        <p>
          If you create an account or join the waitlist, keep your credentials safe and provide an email you control.
          Signed-in accounts may sync learning state and course PDFs to private cloud storage so you can continue on
          another device. We may remove abusive accounts or waitlist entries.
        </p>

        <h2>Availability</h2>
        <p>
          Kelus is provided as-is. Features may change as the product evolves. Local browser storage can be cleared by
          you or by the browser; keep your own backups of critical notes even if you use sync.
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
