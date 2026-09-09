import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy — Kelus",
  description: "How Kelus handles course files, local study data, optional accounts, and analytics.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main id="main" className="legal-page">
      <article className="legal-panel">
        <p className="kicker">Legal</p>
        <h1>Privacy</h1>
        <p className="legal-updated">Last updated: September 8, 2026</p>
        <p className="legal-lede">
          Kelus is a local-first revision and exam practice tool. Without an account, your course PDFs and study progress stay on this
          device. If you sign in, Kelus can sync that work to your private account so you can continue on another
          browser.
        </p>

        <h2>What stays on your device by default</h2>
        <ul>
          <li>
            <strong>Course materials</strong> — PDFs you upload are read in the browser to propose concepts. Concept
            extraction runs on this device. Without sign-in, PDF files stay in this browser’s storage.
          </li>
          <li>
            <strong>Study state</strong> — exam setup, confirmed concepts, diagnosis answers, and session history are
            stored in browser storage on this device.
          </li>
          <li>
            <strong>Saved links</strong> — video and web URLs you add are bookmarks on the source shelf. Kelus does not
            fetch or analyze those pages for concepts.
          </li>
        </ul>

        <h2>Optional account and sync</h2>
        <p>
          If you sign in, authentication is handled by Supabase. That may store your email, auth identifiers, and any
          profile fields you provide. When signed in, Kelus can also sync:
        </p>
        <ul>
          <li>
            <strong>Learning state</strong> — your course, exam date, confirmed concepts, diagnosis, and session history
            to your private account.
          </li>
          <li>
            <strong>Course PDFs</strong> — copies of uploaded PDFs to private storage in your account so they are
            available across devices. Processing still happens in the browser first.
          </li>
        </ul>
        <p>
          You can keep using Kelus without signing in. Skip the waitlist if you only want revision on this device.
        </p>

        <h2>Questions inbox</h2>
        <p>
          If you send a question through the Questions page, we store your name, email, and message so we can reply.
          You can also email <a href="mailto:hello@kelus.me">hello@kelus.me</a> directly.
        </p>

        <h2>Waitlist</h2>
        <p>
          If you join the waitlist, we store the email (and optional note) you submit so we can contact you about Exam
          Pass launch and product updates. You can ask to be removed anytime at{" "}
          <a href="mailto:hello@kelus.me">hello@kelus.me</a>.
        </p>

        <h2>Analytics</h2>
        <p>
          When analytics are configured for kelus.me, Kelus can use Google Analytics 4 with ads signals off and IP
          anonymization on. Analytics stay off until you Accept in the on-site choice; Decline keeps them off. Your
          choice is stored in this browser as <code>kelus:analytics-consent:v1</code>. It helps us understand which
          pages are used — not to build an advertising profile.
        </p>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell personal information.</li>
          <li>We do not run third-party ad auctions on Kelus pages.</li>
          <li>We do not use your syllabus to train a public model as part of the current static product.</li>
        </ul>

        <h2>Exam Pass</h2>
        <p>
          If you buy Exam Pass, unlock is verified by the Kelus edge (HttpOnly cookie after a Stripe checkout session
          check or a redeem code from hello@kelus.me). That unlock lets this browser show the remaining-day plan, calendar
          file, and printable topic list. It is not a grade guarantee. A bare <code>?pass=1</code> link does not unlock
          the plan. Contact <a href="mailto:hello@kelus.me">hello@kelus.me</a> if you paid and the plan is still locked —
          include your receipt email.
        </p>

        <h2>Shared devices</h2>
        <p>
          Study answers, course PDFs, and on-device waitlist or questions backups live in this browser’s storage. On a
          shared computer, anyone using the same browser can see that local data until you sign out and clear this
          site’s data.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>Clear site data in your browser to remove local study state, on-device PDFs, and your analytics choice.</li>
          <li>Accept or Decline optional analytics when prompted; Decline means no Google Analytics hits from this browser.</li>
          <li>Skip sign-in and waitlist if you want to keep using Kelus only on this device.</li>
          <li>
            Contact <a href="mailto:hello@kelus.me">hello@kelus.me</a> to delete an account, synced materials, or
            waitlist email we hold.
          </li>
        </ul>

        <h2>Contact</h2>
        <p>
          Privacy questions: <a href="mailto:hello@kelus.me">hello@kelus.me</a>
          {" · "}
          <Link href="/terms">Terms</Link>
        </p>
      </article>
      <SiteFooter compact />
    </main>
  );
}
