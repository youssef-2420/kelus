import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Waitlist — Kelus",
  description: "Join the Kelus waitlist for early access updates on the local-first exam planner.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistPage() {
  return (
    <main id="main" className="legal-page waitlist-page">
      <section className="legal-panel">
        <p className="kicker">Early access</p>
        <h1>Get Kelus when it’s ready for your course.</h1>
        <p className="legal-lede">
          Kelus turns your syllabus into a daily exam route. Join the list if you want a quiet note when new courses,
          sync, or study features land — not a marketing drip.
        </p>
        <WaitlistForm source="waitlist_page" />
        <p className="legal-inline-links">
          Prefer to try now? <Link href="/today">Build today’s route</Link>
          {" · "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
      <SiteFooter compact />
    </main>
  );
}
