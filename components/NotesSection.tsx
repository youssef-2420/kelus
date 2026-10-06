import type { ExtractedMaterialPage } from "@/domain/types";
import styles from "./NotesSection.module.css";

/** One section of the learner's notes, as the original text with its headings, not a rewrite. */
export function NotesSection({ page, title }: { page: ExtractedMaterialPage; title: string }) {
  const blocks = page.blocks ?? [{ text: page.text, x: 0, y: 0, width: 0, height: 12, fontSize: 12 }];
  return (
    <article className={styles.section} aria-label={`Section ${page.pageNumber} of ${title}`}>
      {blocks.map((block, index) => {
        if (block.fontSize >= 20) return <h2 key={index} className={styles.h1}>{block.text}</h2>;
        if (block.fontSize >= 14) return <h3 key={index} className={styles.h2}>{block.text}</h3>;
        const bullet = block.text.match(/^•\s+(.*)$/);
        return bullet ? <p key={index} className={styles.bullet}><span aria-hidden="true">•</span>{bullet[1]}</p> : <p key={index}>{block.text}</p>;
      })}
    </article>
  );
}
