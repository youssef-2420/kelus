import { buildPractice } from "./content-engine";
import { isDrillable } from "./practice-check";
import type { Concept, LearningActivity, PracticeItem } from "./types";

export type AnkiCard = { front: string; back: string; tags: string };

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** One field per tab-separated column: tabs and line breaks inside a field would split it. */
const field = (html: string) => html.replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
const tag = (name: string) => name.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");

function cardFrom(item: PracticeItem, topic: string, locator: string): AnkiCard {
  const options = item.kind === "choice" && item.choices?.length
    ? `<ol type="A">${item.choices.map((choice) => `<li>${escape(choice)}</li>`).join("")}</ol>`
    : "";
  return {
    front: `${escape(item.prompt)}${options}`,
    back: `<b>${escape(item.modelAnswer)}</b><br><br><i>“${escape(item.sourceQuote)}”</i><br><small>${escape(topic)} · ${escape(locator)}</small>`,
    tags: `kelus ${tag(topic)}`,
  };
}

/**
 * Every question Kelus would ask, as Anki cards: the checks of each topic (answer and the exact line from the notes on
 * the back), plus its "say it in your own words" prompt. Built from the same pages, so the cards quote the notes.
 */
export function ankiCards(concepts: Concept[], activities: LearningActivity[]): AnkiCard[] {
  const cards: AnkiCard[] = [];
  for (const concept of concepts) {
    const activity = activities.find((item) => item.conceptId === concept.id);
    if (!activity) continue;
    const locator = activity.sourceReferences[0]?.locator ?? "your notes";
    const siblingNames = concepts.map((other) => other.name);
    const items = activity.practice?.length
      ? activity.practice
      : buildPractice({ conceptId: concept.id, name: concept.name, excerpt: [activity.learn.explanation, ...activity.learn.keyPoints].join("\n"), locator, siblingNames });
    const seen = new Set<string>();
    for (const item of items.filter(isDrillable)) {
      if (seen.has(item.prompt)) continue;
      seen.add(item.prompt);
      cards.push(cardFrom(item, concept.name, locator));
    }
    if (activity.retrieve.prompt && activity.retrieve.modelAnswer) {
      cards.push({
        front: escape(activity.retrieve.prompt),
        back: `${escape(activity.retrieve.modelAnswer)}<br><small>${escape(concept.name)} · ${escape(locator)}</small>`,
        tags: `kelus ${tag(concept.name)} explain`,
      });
    }
  }
  return cards;
}

/** Anki's text import (File → Import): tab-separated, with headers that set the note type, deck and tags column. */
export function ankiFile(deck: string, cards: AnkiCard[]) {
  const header = ["#separator:tab", "#html:true", "#notetype:Basic", `#deck:Kelus::${deck.replace(/[\t\r\n:]+/g, " ").replace(/\s{2,}/g, " ").trim() || "My course"}`, "#tags column:3"];
  return [...header, ...cards.map((card) => [field(card.front), field(card.back), card.tags].join("\t"))].join("\n") + "\n";
}
