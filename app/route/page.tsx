import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";

export const metadata: Metadata = {
  title: "Kelus — Your learning has a route",
  description: "Watch Kelus choose a route from where you are, the time you have, and what the exam actually rewards.",
  alternates: { canonical: "/route" },
};

export default function RoutePage() {
  return (
    <div className="home route-page">
      <main id="main">
        <HowItWorks />
      </main>
    </div>
  );
}
