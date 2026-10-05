import styles from "./InkArt.module.css";

export type InkArtName = "read" | "retrieve" | "use" | "mark" | "sources" | "topics";

const LABEL: Record<InkArtName, string> = {
  read: "An open course page with one line highlighted",
  retrieve: "A blank answer sheet and a pencil",
  use: "A demand curve with a question card",
  mark: "A large pass-mark tick in a circle",
  sources: "Two course PDFs on a shelf",
  topics: "Linked topic nodes with one marked as the start",
};

/**
 * One ink-drawing system for the whole product: black line on paper, Kelus green for the one thing that matters.
 * Decorative by default (aria-hidden); pass `label` to expose it.
 */
export function InkArt({ name, className, label }: { name: InkArtName; className?: string; label?: boolean }) {
  return (
    <svg
      className={`${styles.art} ${className ?? ""}`}
      viewBox="0 0 300 230"
      role={label ? "img" : undefined}
      aria-label={label ? LABEL[name] : undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-art={name}
    >
      {name === "read" ? (
        <>
          <path className={styles.d} pathLength={1} d="M40 62C80 50 112 52 150 66V176C112 162 80 160 40 172Z" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M150 66C188 52 220 50 260 62V172C220 160 188 162 150 176" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M62 88C86 84 106 86 128 94M62 108C86 104 106 106 128 114M62 128C80 125 96 126 112 132" />
          <path className={`${styles.d} ${styles.d3} ${styles.g} ${styles.hl}`} pathLength={1} d="M172 92C196 88 218 90 240 96" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M172 116C196 112 218 114 240 120M172 138C190 136 206 137 222 142" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M236 30l6 14M254 36l-8 12M222 34l1 14" />
        </>
      ) : null}
      {name === "retrieve" ? (
        <>
          <rect className={`${styles.d} ${styles.sheet}`} pathLength={1} x="46" y="40" width="150" height="170" rx="3" />
          <path className={`${styles.d2} ${styles.dots}`} d="M68 82H172M68 112H172M68 142H148" />
          <path className={`${styles.d} ${styles.d2} ${styles.g}`} pathLength={1} d="M70 80C84 70 94 90 108 78S130 72 144 80" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M204 168L252 74L264 80L216 174ZM204 168L200 188L216 174" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M236 30c0-12 20-12 20 0c0 9-10 9-10 18M246 58v2" />
        </>
      ) : null}
      {name === "use" ? (
        <>
          <path className={styles.d} pathLength={1} d="M52 36V182H258" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M70 60C110 100 170 140 240 160" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M70 160C110 140 170 100 240 54" />
          <circle className={`${styles.d} ${styles.d3} ${styles.g} ${styles.node}`} pathLength={1} cx="155" cy="108" r="9" />
          <path className={`${styles.d3} ${styles.g} ${styles.dots}`} d="M155 117V182M146 108H52" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M200 40h50v34h-50zM208 52h34M208 62h22" />
        </>
      ) : null}
      {name === "mark" ? (
        <>
          <circle className={`${styles.d} ${styles.g} ${styles.ring}`} pathLength={1} cx="150" cy="108" r="64" />
          <path className={`${styles.d} ${styles.d2} ${styles.g} ${styles.tick}`} pathLength={1} d="M118 110L142 134L186 84" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M44 190H256M60 40l10 12M244 36l-10 14M258 100l16 4M26 100l16 4" />
        </>
      ) : null}
      {name === "sources" ? (
        <>
          <rect className={`${styles.d} ${styles.sheet}`} pathLength={1} x="40" y="46" width="104" height="132" rx="3" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M58 76H126M58 96H116M58 126H128M58 146H108" />
          <rect className={`${styles.d} ${styles.d2} ${styles.sheet}`} pathLength={1} x="132" y="64" width="104" height="132" rx="3" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M150 94H218M150 114H208M150 144H220M150 164H200" />
          <path className={`${styles.d} ${styles.d3} ${styles.g} ${styles.hl}`} pathLength={1} d="M150 112H206" />
          <path className={`${styles.d} ${styles.d3}`} pathLength={1} d="M30 206H262" />
        </>
      ) : null}
      {name === "topics" ? (
        <>
          <path className={`${styles.d} ${styles.g}`} pathLength={1} d="M64 150C110 150 120 70 160 70" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M160 70C204 70 214 140 246 140" />
          <path className={`${styles.d} ${styles.d2}`} pathLength={1} d="M160 70C186 112 186 150 160 190" />
          <circle className={`${styles.d} ${styles.d2} ${styles.sheet}`} pathLength={1} cx="64" cy="150" r="14" />
          <circle className={`${styles.d} ${styles.d3} ${styles.g} ${styles.node}`} pathLength={1} cx="160" cy="70" r="18" />
          <circle className={`${styles.d} ${styles.d3} ${styles.sheet}`} pathLength={1} cx="246" cy="140" r="14" />
          <circle className={`${styles.d} ${styles.d3} ${styles.sheet}`} pathLength={1} cx="160" cy="190" r="11" />
          <path className={`${styles.d} ${styles.d3} ${styles.g}`} pathLength={1} d="M152 70L158 77L170 62" />
        </>
      ) : null}
    </svg>
  );
}
