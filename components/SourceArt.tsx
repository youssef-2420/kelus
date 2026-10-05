import type { MaterialRole } from "@/domain/types";
import styles from "./TopicArt.module.css";

type SourceKind = "slides" | "notes" | "syllabus" | "exam" | "outline" | "link";

function kindFor(role: MaterialRole, isLink: boolean): SourceKind {
  if (isLink) return "link";
  if (role === "lecture_slides") return "slides";
  if (role === "syllabus") return "syllabus";
  if (role === "past_exam") return "exam";
  if (role === "course_outline") return "outline";
  return "notes";
}

/** One ink drawing per kind of source, in the same line style as the topic drawings. */
export function SourceArt({ role, isLink = false }: { role: MaterialRole; isLink?: boolean }) {
  const kind = kindFor(role, isLink);
  return (
    <svg className={styles.art} viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-source-art={kind}>
      {kind === "slides" ? (
        <>
          <rect x="6" y="12" width="52" height="34" rx="2" />
          <path d="M14 22H34" className={styles.g} />
          <path d="M14 30H44M14 37H38" />
          <path d="M32 46V54M22 56H42" />
        </>
      ) : null}
      {kind === "notes" ? (
        <>
          <rect x="14" y="8" width="36" height="48" rx="2" />
          <path d="M22 20H42M22 28H42M22 36H34" />
          <path className={styles.g} d="M22 44H38" />
        </>
      ) : null}
      {kind === "syllabus" ? (
        <>
          <rect x="14" y="8" width="36" height="48" rx="2" />
          <path className={styles.g} d="M20 20L23 23L28 17" />
          <path d="M33 20H44M20 32L23 35L28 29M33 32H44M20 44H28M33 44H44" />
        </>
      ) : null}
      {kind === "exam" ? (
        <>
          <rect x="14" y="8" width="36" height="48" rx="2" />
          <path d="M22 20H42M22 28H38" />
          <circle className={styles.g} cx="40" cy="43" r="8" />
          <path className={styles.g} d="M36 43L39 46L44 40" />
        </>
      ) : null}
      {kind === "outline" ? (
        <>
          <path d="M14 14H20M26 14H50M20 26H26M32 26H50M20 38H26M32 38H50" />
          <path className={styles.g} d="M14 50H20M26 50H44" />
        </>
      ) : null}
      {kind === "link" ? (
        <>
          <path d="M26 38L38 26" className={styles.g} />
          <path d="M30 20L34 16C38 12 44 12 48 16C52 20 52 26 48 30L44 34" />
          <path d="M34 44L30 48C26 52 20 52 16 48C12 44 12 38 16 34L20 30" />
        </>
      ) : null}
    </svg>
  );
}
