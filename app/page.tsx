import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";
import { StartHereJourney } from "@/components/home/StartHereJourney";

export default function Home() {
  return (
    <div className="home">
      <main id="main">
        <KelusHero />
        <StartHereJourney />
        <HomeAfterHero />
      </main>
    </div>
  );
}
