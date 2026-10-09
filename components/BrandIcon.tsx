import { siAnki, siMarkdown, siNotion, siObsidian } from "simple-icons";

/**
 * Other products' own logos, from simple-icons (CC0), drawn unaltered and in each brand's own colour, so a student
 * recognises them at a glance: Anki's blue star, Obsidian's purple gem, Notion's and Markdown's black marks.
 * Only where the product is a place your notes come from or go to.
 */
const ICONS = { notion: siNotion, anki: siAnki, obsidian: siObsidian, markdown: siMarkdown } as const;

export type Brand = keyof typeof ICONS;

export function BrandIcon({ brand, size = 16, className, label, tile = false }: { brand: Brand; size?: number; className?: string; /** Name it for screen readers when it stands alone; omit when the name is written beside it. */ label?: string; /** The app-icon form people know from their dock: the mark in white on a tile of the brand colour. */ tile?: boolean }) {
  const icon = ICONS[brand];
  if (tile) {
    return (
      <svg className={className} viewBox="0 0 32 32" width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false" style={{ display: "inline-block", flex: "none" }}>
        <rect width="32" height="32" rx="8" fill={`#${icon.hex}`} />
        <path d={icon.path} fill="#fff" transform="translate(5 5) scale(0.9167)" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${icon.hex}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ display: "inline-block", flex: "none", verticalAlign: "-0.15em" }}
    >
      <path d={icon.path} />
    </svg>
  );
}

/** Notes read from a Notion export carry `variant=notion` (see lib/zip-notes). Pasted notes are plain .md: no mark. */
export function brandForFile(fileName?: string | null, mimeType?: string | null): Brand | null {
  return /variant=notion/i.test(mimeType ?? "") || (fileName ?? "").toLocaleLowerCase().endsWith(".zip") ? "notion" : null;
}
