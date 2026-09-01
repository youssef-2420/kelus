export function normalizeSearchQuery(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
}
