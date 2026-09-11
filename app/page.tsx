import type { Metadata } from "next";
import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Kelus — Revise your lessons. Prepare for exams.",
  description: "Revise your course material with recall questions, application practice, and answer feedback. Kelus uses your answers to suggest what to review before your exam.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kelus — Revise your lessons. Prepare for exams.",
    description: "Practise recalling your lessons, check your answers, and revisit weaker topics before your exam.",
    url: "/",
    type: "website",
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kelus",
    url: "https://kelus.me/",
    description: "A revision and exam practice tool that uses course material and answer evidence to suggest what to study next.",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    isAccessibleForFree: true,
  };

  return (
    <LateralPage>
      <div className="home">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <main id="main">
          <KelusHero />
          <HomeAfterHero />
        </main>
      </div>
    </LateralPage>
  );
}
