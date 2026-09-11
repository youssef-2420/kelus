import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "How to revise with Kelus — Course notes to exam practice",
  description: "Add your course material, check what you recall, practise your lessons, and revisit weaker topics. See how Kelus adapts your exam revision to your answers.",
  alternates: { canonical: "/route" },
};

export default function RoutePage() {
  return (
    <LateralPage>
    <div className="home route-page">
      <main id="main">
        <HowItWorks />
      </main>
    </div>
  </LateralPage>
  );
}
