import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage presents marked-script hero followed by the illustrated revision story", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const hero = readFileSync("components/hero/KelusHero.tsx", "utf8");
  const story = readFileSync("components/home/HomeAfterHero.tsx", "utf8");
  assert.match(page, /KelusHero/);
  assert.doesNotMatch(page, /StartHereJourney/);
  assert.match(page, /HomeAfterHero/);
  assert.match(hero, /is-folio|is-poster/);
  assert.match(hero, /Revise your lessons/);
  assert.doesNotMatch(hero, /Try sample \(~1 min\)/);
  assert.doesNotMatch(hero, /today\?sample=1/);
  assert.match(hero, /Set up/);
  assert.doesNotMatch(hero, /Set up with your own course material/);
  assert.match(hero, /ExamRoutePoster/);
  assert.doesNotMatch(hero, /LEARNING_EXAMPLES/);
  assert.doesNotMatch(hero, /home-brand/);
  assert.doesNotMatch(hero, /hero-window-controls/);
  assert.doesNotMatch(story, /HeroProductDemo/);
  assert.doesNotMatch(story, /BookletRevisionBoard|poster-sample|Interactive sample/);
  assert.match(story, /RevisionLoopVisuals/);
  assert.doesNotMatch(story, /home-close|folio-close|Walk into the exam knowing/);
  assert.doesNotMatch(story, /Try sample \(~1 min\)/);
  assert.doesNotMatch(story, /Set my exam/);
  assert.doesNotMatch(story, /folio-chapter|TodayPlanIllustration|RerouteIllustration|MaterialShelfIllustration/);
  assert.doesNotMatch(story, /Honest methodology|folio-method/);
  assert.doesNotMatch(page, /KnowledgeRouteStory/);
  assert.doesNotMatch(page, /<RouteStory/);
});

test("the start-here route explains the full first-use loop without generic cards", () => {
  const journey = readFileSync("components/home/StartHereJourney.tsx", "utf8");
  assert.match(journey, /Set the destination/);
  assert.match(journey, /Show what you know/);
  assert.match(journey, /Follow today’s route/);
  assert.match(journey, /Answer, then reroute/);
  assert.match(journey, /Kelus starts adapting here/);
  assert.match(journey, /Build my first route/);
  assert.match(journey, /useReducedMotion/);
});

test("route explainer lives on its own page", () => {
  const page = readFileSync("app/route/page.tsx", "utf8");
  const story = readFileSync("components/HowItWorks.tsx", "utf8");
  const examples = readFileSync("data/learning-examples.ts", "utf8");
  assert.match(page, /HowItWorks/);
  assert.match(story, /Add the lessons you want to revise/);
  assert.match(story, /Confirm your revision topics/);
  assert.match(story, /Show what you know/);
  assert.match(story, /Start today’s revision/);
  assert.match(story, /Review, recall, and apply/);
  assert.match(story, /Your answer changes the route/);
  assert.match(story, /<h1 id="how-title"/);
  assert.doesNotMatch(story, /BlurText/);
  assert.match(story, /SourceVisual/);
  assert.match(story, /RecallVisual/);
  assert.match(story, /RerouteVisual/);
  assert.match(story, /data-tone=\{tone\}/);
  assert.match(examples, /Economics|Microeconomics/);
  assert.match(examples, /Computer science/);
  assert.match(examples, /History/);
  assert.match(story, /Choose an example course/);
  assert.match(story, /Not a predicted grade/);
});

test("how-it-works illustrations explain causality without raster assets", () => {
  const illustrations = readFileSync("components/how/HowIllustrations.tsx", "utf8");
  assert.match(illustrations, /Course pages becoming a confirmed concept map/);
  assert.match(illustrations, /One selected study route through several possibilities/);
  assert.match(illustrations, /A learning answer changing the next route/);
  assert.match(illustrations, /useReducedMotion|reduceMotion/);
  assert.doesNotMatch(illustrations, /<img/);
});
