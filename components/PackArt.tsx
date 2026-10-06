/**
 * Line icons and drawings from the Notion-style pack (see public/art/notion-pack/SOURCE.md).
 * They are decorative: the words next to them carry the meaning, so they are hidden from screen readers.
 */
const ART = {
  "list-check": { src: "/art/notion-pack/icon-list-check.svg", width: 24, height: 24 },
  folder: { src: "/art/notion-pack/icon-folder.svg", width: 24, height: 24 },
  "diagram-project": { src: "/art/notion-pack/icon-diagram-project.svg", width: 24, height: 24 },
  award: { src: "/art/notion-pack/icon-award.svg", width: 24, height: 24 },
  check: { src: "/art/notion-pack/icon-check.svg", width: 24, height: 24 },
  info: { src: "/art/notion-pack/icon-info.svg", width: 24, height: 24 },
  "clipboard-check": { src: "/art/notion-pack/icon-clipboard-check.svg", width: 24, height: 24 },
  growing: { src: "/art/notion-pack/art-growing.svg", width: 321, height: 301 },
  "time-flies": { src: "/art/notion-pack/art-time-flies.svg", width: 195, height: 150 },
  target: { src: "/art/notion-pack/art-target.svg", width: 186, height: 150 },
  "on-the-laptop": { src: "/art/notion-pack/art-on-the-laptop.svg", width: 420, height: 250 },
} as const;

export type PackArtName = keyof typeof ART;

export function PackArt({ name, className, size }: { name: PackArtName; className?: string; size?: number }) {
  const art = ART[name];
  const scale = size ? size / art.width : 1;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, small decorative SVGs
    <img src={art.src} alt="" aria-hidden="true" className={className} width={Math.round(art.width * scale)} height={Math.round(art.height * scale)} draggable={false} />
  );
}
