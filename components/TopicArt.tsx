import styles from "./TopicArt.module.css";

export type TopicArtKind =
  | "curve" | "bars" | "overlap" | "scales" | "cell" | "code" | "timeline" | "formula"
  | "book" | "bulb" | "notes" | "puzzle";

const RULES: Array<[RegExp, TopicArtKind]> = [
  [/\b(cross|versus|vs\.?|compare|comparison|correlat|substitut|complement|relationship)/i, "overlap"],
  [/\b(tax|law|legal|polic|rule|court|justice|rights?|regulat|ethic|contract)/i, "scales"],
  [/\b(revenue|cost|profit|growth|gdp|budget|statistic|data|trend|income|market|sales|finance|invest)/i, "bars"],
  [/\b(elastic|demand|supply|price|curve|equilibri|marginal|function|graph|slope|rate)/i, "curve"],
  [/\b(cell|biolog|dna|gene|organism|membrane|protein|enzyme|osmosis|atp|tissue|anatom|physiolog)/i, "cell"],
  [/\b(algorithm|code|program|software|compil|database|network|computer|binary|recursion|array)/i, "code"],
  [/\b(histor|war|era|centur|revolution|period|empire|ancient|medieval|timeline|dynast)/i, "timeline"],
  [/\b(equation|theorem|proof|calculus|algebra|math|derivative|integral|probabilit|geometry|matrix|vector)/i, "formula"],
];

const FALLBACK: TopicArtKind[] = ["book", "bulb", "notes", "puzzle"];

/**
 * Picks a drawing from the topic's own words. Unmatched topics get a neutral
 * drawing chosen from the name, so the same topic always looks the same.
 */
export function topicArtKind(name: string): TopicArtKind {
  for (const [pattern, kind] of RULES) if (pattern.test(name)) return kind;
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

/** Subject-agnostic ink motifs: black line for the object, Kelus green for the one idea that matters. */
export function TopicArt({ kind, className }: { kind: TopicArtKind; className?: string }) {
  return (
    <svg className={`${styles.art} ${className ?? ""}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-topic-art={kind}>
      {kind === "curve" ? (
        <>
          <path d="M10 8V54H56" />
          <path d="M16 16C26 38 40 48 54 50" />
          <path d="M16 48C28 40 42 26 54 14" />
          <circle className={styles.g} cx="35" cy="33" r="4.5" />
        </>
      ) : null}
      {kind === "bars" ? (
        <>
          <rect x="11" y="32" width="10" height="22" />
          <rect x="27" y="22" width="10" height="32" />
          <rect className={styles.gFill} x="43" y="10" width="10" height="44" />
          <path d="M8 56H58" />
        </>
      ) : null}
      {kind === "overlap" ? (
        <>
          <circle cx="23" cy="32" r="15" />
          <circle cx="41" cy="32" r="15" />
          <path className={styles.g} d="M32 19.5C36.5 24 36.5 40 32 44.5C27.5 40 27.5 24 32 19.5Z" />
        </>
      ) : null}
      {kind === "scales" ? (
        <>
          <path d="M32 10V52M20 52H44" />
          <path d="M12 20H52" />
          <path d="M12 20L6 36H18Z" />
          <path d="M52 20L46 36H58Z" />
          <path className={styles.g} d="M6 36C6 42 18 42 18 36M46 36C46 42 58 42 58 36" />
        </>
      ) : null}
      {kind === "cell" ? (
        <>
          <ellipse cx="32" cy="32" rx="22" ry="18" />
          <circle cx="28" cy="30" r="7" />
          <circle className={styles.g} cx="28" cy="30" r="2.5" />
          <path d="M42 24L46 22M44 36L49 38M38 46L40 51" />
        </>
      ) : null}
      {kind === "code" ? (
        <>
          <rect x="8" y="12" width="48" height="40" rx="3" />
          <path d="M8 22H56" />
          <path className={styles.g} d="M20 32L14 38L20 44M44 32L50 38L44 44" />
          <path d="M34 30L30 46" />
        </>
      ) : null}
      {kind === "timeline" ? (
        <>
          <path d="M6 32H58" />
          <circle cx="16" cy="32" r="4" />
          <circle className={styles.g} cx="32" cy="32" r="5.5" />
          <circle cx="48" cy="32" r="4" />
          <path d="M16 28V18M32 26V12M48 28V20M16 36V46M48 36V44" />
        </>
      ) : null}
      {kind === "formula" ? (
        <>
          <path d="M44 14H20L34 32L20 50H44" />
          <path className={styles.g} d="M10 56H54" />
        </>
      ) : null}
      {kind === "book" ? (
        <>
          <path d="M8 16C18 12 26 13 32 17V52C26 48 18 47 8 51Z" />
          <path d="M32 17C38 13 46 12 56 16V51C46 47 38 48 32 52" />
          <path className={styles.g} d="M40 26C45 25 49 25 52 26" />
        </>
      ) : null}
      {kind === "bulb" ? (
        <>
          <path d="M32 8C21 8 15 16 15 24C15 31 20 34 22 40H42C44 34 49 31 49 24C49 16 43 8 32 8Z" />
          <path d="M24 46H40M27 52H37" />
          <path className={styles.g} d="M27 24C27 20 30 18 33 18" />
        </>
      ) : null}
      {kind === "notes" ? (
        <>
          <rect x="14" y="8" width="36" height="46" rx="2" />
          <path d="M22 20H42M22 28H42M22 36H34" />
          <path className={styles.g} d="M22 44L26 48L34 40" />
        </>
      ) : null}
      {kind === "puzzle" ? (
        <>
          <path d="M10 16H28C28 10 38 10 38 16H54V32C48 32 48 42 54 42V54H38C38 48 28 48 28 54H10V42C16 42 16 32 10 32Z" />
          <circle className={styles.g} cx="32" cy="34" r="3" />
        </>
      ) : null}
    </svg>
  );
}
