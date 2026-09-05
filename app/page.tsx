import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";
import { HomeHeader } from "@/components/home/HomeHeader";

export default function Home() {
  return (
    <div className="home">
      <HomeHeader current="home" />

      <main id="main">
        <KelusHero />
        <HomeAfterHero />
      </main>
    </div>
  );
}
