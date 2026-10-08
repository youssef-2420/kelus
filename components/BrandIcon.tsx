import { siAnki, siMarkdown, siNotion, siObsidian } from "simple-icons";

/**
 * Other products' own logos, from simple-icons (CC0), drawn unaltered in the ink of the text around them so they sit
 * in Kelus's hand rather than on it. Only where the product is a place your notes come from or go to.
 */
const ICONS = { notion: siNotion, anki: siAnki, obsidian: siObsidian, markdown: siMarkdown } as const;

export type Brand = keyof typeof ICONS;

export function BrandIcon({ brand, size = 16, className, label }: { brand: Brand; size?: number; className?: string; /** Name it for screen readers when it stands alone; omit when the name is written beside it. */ label?: string }) {
  const icon = ICONS[brand];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
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
