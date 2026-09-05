import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";
import { HomeHeader } from "@/components/home/HomeHeader";
import { KnowledgeRouteStory } from "@/components/home/KnowledgeRouteStory";

export default function Home() {
  return (
    <div className="home">
      <HomeHeader current="home" />

      <main id="main">
        <KelusHero />
        <KnowledgeRouteStory />
        <HomeAfterHero />
      </main>
    </div>
  );
}
