const ebayImageHost = "i.ebayimg.com";

export function optimizedRetailerImageUrl(value?: string, width = 300) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== ebayImageHost) return value;
    const boundedWidth = Math.max(64, Math.min(600, Math.round(width)));
    url.pathname = url.pathname.replace(/\/s-l\d+\.(?:jpg|jpeg|png|webp)$/i, `/s-l${boundedWidth}.jpg`);
    return url.toString();
  } catch {
    return value;
  }
}
