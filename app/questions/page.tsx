import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { QuestionsForm } from "@/components/QuestionsForm";
import { QuestionsExport } from "@/components/QuestionsExport";

export const metadata: Metadata = {
  title: "Ask a question — Kelus",
  description: "Send a question about Kelus, today’s route, materials, or Exam Pass. We’ll reply by email.",
  alternates: { canonical: "/questions" },
};

export default function QuestionsPage() {
  return (
    <main id="main" className="legal-page questions-page">
      <section className="legal-panel">
        <p className="kicker">Questions</p>
        <h1>Ask us anything about Kelus.</h1>
        <p className="legal-lede">
          Stuck on Materials, Map, Today, or Exam Pass? Send a question here. It goes to the Kelus inbox and we reply by
          email — not a public forum.
        </p>
        <QuestionsForm source="questions_page" />
        <QuestionsExport />
        <p className="legal-inline-links">
          Prefer email? <a href="mailto:hello@kelus.me">hello@kelus.me</a>
          {" · "}
          <Link href="/today">Build today’s route</Link>
          {" · "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
      <SiteFooter compact />
    </main>
  );
}
