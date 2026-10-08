export type SearchItem = { id: string; group: "Topics" | "Go to"; label: string; detail?: string; href: string };

/** Best first, within each group: names that start with the query, then a word that starts with it, then anywhere in the name. */
export function rankItems(items: SearchItem[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return items;
  const score = (item: SearchItem) => {
    const name = item.label.toLocaleLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.split(/[\s/(),.-]+/).some((word) => word.startsWith(q))) return 1;
    if (name.includes(q)) return 2;
    if (item.detail?.toLocaleLowerCase().includes(q)) return 3;
    return -1;
  };
  return items
    .map((item, index) => ({ item, index, rank: score(item) }))
    .filter((entry) => entry.rank >= 0)
    // Topics stay above sections, so each group is listed once; within a group, the best match first.
    .sort((a, b) => Number(a.item.group !== "Topics") - Number(b.item.group !== "Topics") || a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}
