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
        <p className="legal-updated">Last updated: October 7, 2026</p>
        <p className="legal-lede">
          Kelus is a local-first revision and exam practice tool. Without an account, your course PDFs and study progress stay on this
          device. If you sign in, Kelus can sync that work to your private account so you can continue on another
          browser.
        </p>

        <h2>What stays on your device by default</h2>
        <ul>
          <li>
            <strong>Course materials</strong> — PDFs you upload are read in the browser to propose concepts. Concept
            extraction and the standard questions are made on this device. Without sign-in, PDF files stay in this browser’s storage.
            The one exception is the optional AI question writing described below, which is off until you turn it on.
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
          When analytics are configured for kelus.me, Kelus uses Google Analytics 4 with ads signals off and IP
          anonymization on. It helps us understand which pages are used — not to build an advertising profile.
        </p>

        <h2 id="ai-questions">Optional: AI-written questions</h2>
        <p>
          This is off by default and appears in Materials only when it is available. When you turn it on, there are two cases:
        </p>
        <ul>
          <li>
            <strong>On-device model</strong> — if your Chrome has its own built-in model, the questions are written inside your
            browser and your notes never leave this device. Chrome downloads the model once (about 2 GB).
          </li>
          <li>
            <strong>Hosted model</strong> — Kelus sends the text of one topic at a time, with writing instructions, to a small
            Kelus service that passes it to Anthropic’s API to write the questions. Your files, name, email and answers are not
            sent. The Kelus service does not store or log the text. Anthropic processes it under its own API terms, which may
            include keeping it for a limited time; Kelus does not use it to train a model.
          </li>
        </ul>
        <p>
          Every written question must quote your page, and any that does not is discarded. The written questions are kept in this
          browser. Turning the switch off removes them from this device. Text that was already sent cannot be recalled by Kelus.
        </p>

        <h2>Reading scanned PDFs</h2>
        <p>
          If a PDF is a scan with no selectable text, Kelus reads it on your device with an open-source text-recognition
          engine. To do that, your browser downloads the engine and its English language data from the jsDelivr public
          CDN (cdn.jsdelivr.net). For this step your pages and their text are not sent anywhere; the request is only for the engine,
          so jsDelivr can see that your browser asked for it. PDFs with real text never make this request.
        </p>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not sell personal information.</li>
          <li>We do not run third-party ad auctions on Kelus pages.</li>
          <li>We do not use your notes or syllabus to train a model.</li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>Clear site data in your browser to remove local study state and on-device PDFs.</li>
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
