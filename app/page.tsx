import type { Metadata } from "next";
import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="home">
      <main id="main">
        <KelusHero />
        <HomeAfterHero />
      </main>
    </div>
  );
}
