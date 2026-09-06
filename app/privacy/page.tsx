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
        <p className="legal-updated">Last updated: September 6, 2026</p>
        <p className="legal-lede">
          Kelus is a local-first exam planner. Your course PDFs and study progress stay on this device by default.
          This page explains what optional services may collect if you use them.
        </p>

        <h2>What stays on your device</h2>
        <ul>
          <li>
            <strong>Course materials</strong> — PDFs you upload are read in the browser to propose concepts. Kelus does
            not upload those files to Kelus servers as part of the static planner.
          </li>
          <li>
            <strong>Study state</strong> — exam setup, confirmed concepts, diagnosis answers, and session history are
            stored in browser storage on this device.
          </li>
        </ul>

        <h2>Optional account</h2>
        <p>
          If you sign in, authentication is handled by Supabase. That may store your email, auth identifiers, and any
          profile fields you provide so you can restore a session on another browser. Course PDFs are still processed
          locally unless a future sync feature says otherwise in product copy.
        </p>

        <h2>Waitlist</h2>
        <p>
          If you join the waitlist, we store the email (and optional note) you submit so we can contact you about
          early access. You can ask to be removed anytime at{" "}
          <a href="mailto:hello@kelus.me">hello@kelus.me</a>.
        </p>

        <h2>Analytics</h2>
        <p>
          When analytics are configured for kelus.me, Kelus uses Google Analytics 4 with ads signals off and IP
          anonymization on. It helps us understand which pages are used — not to build an advertising profile.
        </p>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell personal information.</li>
          <li>We do not run third-party ad auctions on Kelus pages.</li>
          <li>We do not use your syllabus to train a public model as part of the current static product.</li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>Clear site data in your browser to remove local study state.</li>
          <li>Skip sign-in and waitlist if you want to keep using Kelus fully offline in the browser.</li>
          <li>
            Contact <a href="mailto:hello@kelus.me">hello@kelus.me</a> to delete an account or waitlist email we hold.
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
