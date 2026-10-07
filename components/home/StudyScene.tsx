import styles from "./StudyScene.module.css";

export type StudySceneKind = "notes" | "recall" | "feedback" | "route";

/** Adapted from the four Kelus-specific SVG scenes in the supplied Figma Make library. */
export function StudyScene({ kind }: { kind: StudySceneKind }) {
  const common = { className: styles.scene, viewBox: "0 0 680 610", "aria-hidden": true as const, focusable: false as const };

  if (kind === "notes") return (
    <svg {...common}>
      <path className={styles.peach} d="M76 180c42-70 135-95 200-47 61 46 59 140 7 194-59 61-160 73-211 17-37-40-24-109 4-164Z" />
      <g className={styles.inkThin}><path d="M67 509c162 5 324-5 546-1M145 538c118-5 240 6 376 0" /></g>
      <g transform="rotate(-6 300 293)">
        <path className={styles.paper} d="M142 102h303l14 371H158z" />
        <path className={styles.paperBack} d="M126 121h302l14 369H142z" />
        <path className={styles.inkThin} d="M184 171h213m-213 34h174m-174 35h213m-213 34h192m-192 35h213m-213 34h161m-161 35h205" />
        <path className={styles.greenMark} d="M180 258c48-5 105-3 163-1 29 1 52-1 70-5" />
        <path className={styles.ink} d="M398 102v47h47" />
      </g>
      <g className={styles.ink}><path d="M463 187c25-14 62-7 76 17l-83 48c-14-24-7-51 7-65Z" /><path d="m457 251-70 41-20 1 10-17 79-46" /><path d="m516 203 25-15" /></g>
      <g className={styles.idea}><path d="m493 120 10-30m24 45 25-19m-90 6-17-25" /></g>
    </svg>
  );

  if (kind === "recall") return (
    <svg {...common}>
      <path className={styles.lilac} d="M383 88c73-31 157 11 166 82 8 64-50 111-112 104-68-7-124-64-103-123 9-27 25-47 49-63Z" />
      <g className={styles.inkThin}><path d="M78 507c147-9 311 10 525 0M153 537c109-5 240 7 368 0" /></g>
      <path className={styles.paper} d="M101 137h217v310H101z" />
      <path className={styles.paperBack} d="M116 123h217v310H116z" />
      <g className={styles.inkThin}><path d="M147 180h139m-139 29h106m-106 29h139m-139 29h122m-122 80h139m-139 29h91" /></g>
      <path className={styles.greenMark} d="M143 297c45-5 101-4 148 1" />
      <g className={styles.ink}><path d="M400 450h155V246H400z" /><path d="M423 288h109m-109 32h76" /><path d="M423 365c27-23 70-22 91 5-23 28-66 30-91-5Z" /><path d="m454 365 15 15 27-32" /><path d="M446 246v-27h64v27" /><path d="M369 353c-21-16-29-34-24-54 23 4 37 19 40 44" /><path d="m385 343 15 10-19 3" /></g>
      <g className={styles.idea}><path d="m469 175 1-35m-40 50-24-24m104 23 23-25" /></g>
    </svg>
  );

  if (kind === "feedback") return (
    <svg {...common}>
      <path className={styles.peach} d="M390 291c59-46 149-29 178 33 27 58-14 121-75 136-69 16-146-16-152-77-3-34 20-67 49-92Z" />
      <g className={styles.inkThin}><path d="M76 509c145 4 303-7 528 1M158 538c105-6 224 7 354 0" /></g>
      <path className={styles.paper} d="M109 113h301v365H109z" />
      <g className={styles.inkThin}><path d="M146 164h225m-225 32h169m-169 32h225m-225 32h191" /></g>
      <path className={styles.ink} d="M146 313h226v105H146z" />
      <path className={styles.greenWash} d="M157 325h204v80H157z" />
      <g className={styles.ink}><path d="m184 364 25 24 48-55" /><path d="M282 350h57m-57 25h39" /><path d="M434 166h124v90H434z" /><path d="m464 256-15 29 37-29" /><path d="M457 200h78m-78 24h51" /><path d="M456 355h112v101H456z" /><path d="M476 384h72m-72 25h53m-53 24h62" /></g>
      <g className={styles.idea}><path d="m501 119 1-32m-39 42-20-24m98 25 23-22" /></g>
    </svg>
  );

  return (
    <svg {...common}>
      <path className={styles.lilac} d="M75 292c35-64 124-84 181-36 50 42 42 123-8 163-56 44-145 45-181-9-24-36-12-83 8-118Z" />
      <g className={styles.inkThin}><path d="M71 512c150-6 310 9 536-1M159 541c111-6 227 6 352 0" /></g>
      <g className={styles.ink}><path d="M147 128h386v347H147z" /><path d="M147 185h386M220 128v57" /><circle cx="177" cy="156" r="6" /><circle cx="197" cy="156" r="6" /><path d="M181 228h318M181 300h318M181 372h318M181 444h318" /><path d="M215 251h115m-115 72h154m-154 72h93m-93 72h137" /><path d="M449 238h29v29h-29zM449 310h29v29h-29zM449 382h29v29h-29z" /><path d="m455 324 7 8 12-15" /><path d="M165 211h16v244h-16z" /></g>
      <path className={styles.routeHighlight} d="M195 355h286v65H195z" />
      <path className={styles.ink} d="M215 387h93m141-15h29v29h-29z" />
      <g className={styles.idea}><path d="m549 253 29-13m-27 48 31 5m-46-77 14-27" /></g>
    </svg>
  );
}
