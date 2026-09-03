import { products } from "../../../lib/demo-data.ts";
import type { ConditionFilter, OfferCondition, Product, ProductVariant } from "../../../types/kelus.ts";
import type { EbayItemSummary } from "./types.ts";

const accessoryTerms = [
  "case", "cover", "charger", "charging cable", "screen protector", "replacement screen", "tempered glass",
  "camera lens protector", "lcd", "digitizer", "box only", "empty box", "dummy", "display model", "display only",
  "housing", "back glass", "logic board", "motherboard", "sim tray", "flex cable", "phone skin", "wallet case",
  "holster", "bumper", "car mount", "replica", "mockup", "ear pads", "ear cushions", "replacement band",
  "replacement strap", "watch band", "protective shell", "controller only", "stand only", "dock only",
  "power supply only", "keyboard cover", "sleeve only", "replacement earbud", "replacement", "earbud only",
  "left side only", "right side only", "left earbud only", "right earbud only", "charging case only",
];
const partsTerms = ["for parts", "parts only", "repair", "broken", "cracked", "not working", "as is"];
const carrierPatterns = [/\bverizon\b/, /\b(?:at t|att)\b/, /\b(?:t mobile|tmobile)\b/, /\bsprint\b/, /\bcricket\b/, /\bboost mobile\b/, /\bstraight talk\b/, /\bus cellular\b/];
const validStorageSizes = new Set([64, 128, 256, 512, 1024, 2048, 4096]);
const categoryEvidence: Record<string, string[]> = {
  Smartphone: ["cell phone", "smartphone"], Laptop: ["laptop", "notebook", "macbook"],
  Tablet: ["tablet", "ipad", "ebook reader"], Wearable: ["smart watch", "smartwatch", "wearable"],
  Audio: ["headphone", "earbud", "portable audio"], Console: ["video game console", "game console", "console"],
};

export const compact = (value: string) => value.toLowerCase().replace(/([a-z])([0-9])/g, "$1 $2").replace(/([0-9])([a-z])/g, "$1 $2").replace(/[^a-z0-9]+/g, " ").trim();
const condensed = (value: string) => compact(value).replace(/\s/g, "");
const itemTitle = (item: EbayItemSummary) => compact(item.title ?? "");
const containsEvidence = (text: string, evidence: string) => {
  const normalized = compact(evidence);
  return Boolean(normalized) && (compact(text).includes(normalized) || condensed(text).includes(condensed(normalized)));
};

export function normalizeEbayCondition(conditionId?: string, conditionText?: string): OfferCondition | null {
  const id = conditionId?.trim();
  if (id === "1000") return "new";
  if (id === "1500") return "open_box";
  if (["2000", "2010", "2020", "2030", "2500"].includes(id ?? "")) return "refurbished";
  if (["3000", "4000", "5000", "6000", "7000"].includes(id ?? "")) return "used";
  const text = compact(conditionText ?? "");
  if (!text) return null;
  if (text.includes("refurbished") || text.includes("renewed")) return "refurbished";
  if (text.includes("open box") || text.includes("new other")) return "open_box";
  if (text.startsWith("new")) return "new";
  if (text.includes("used") || text.includes("pre owned") || text.includes("preowned")) return "used";
  return null;
}

export function ebayItemText(item: EbayItemSummary) { return compact([item.title, item.shortDescription].filter(Boolean).join(" ")); }
export function isAccessory(item: EbayItemSummary) {
  const title = itemTitle(item);
  return accessoryTerms.some((term) => title.includes(term)) && !/\b(?:with|includes|bundle)\b/.test(title);
}
export function isPartsOnly(item: EbayItemSummary) { const text = ebayItemText(item); return partsTerms.some((term) => text.includes(term)); }

function modelEvidence(product: Product) {
  const identities = product.listingIdentities?.length
    ? product.listingIdentities
    : [product.name, `${product.brand} ${product.name}`, ...(product.aliases ?? [])];
  return [...new Set(identities.map(compact).filter(Boolean))].sort((a, b) => b.length - a.length);
}

export function matchesListingType(item: EbayItemSummary, product: Product) {
  const title = itemTitle(item);
  if (product.category === "Audio" && /\b(left|right)\s+(?:[lr]\s+)?(side|earbud)\b/.test(title)) return false;
  if (product.category !== "Console") return true;
  const gameOnly = /\b(game|software|cartridge|download code|digital code)\b/.test(title);
  const hardwareEvidence = /\b(console|system|hardware|bundle|with console|includes console)\b/.test(title);
  const incompleteHardware = /\b(tablet|console|system|unit)\s+only\b|\bwithout\s+(controllers?|joy cons?|dock)\b|\bno\s+(controllers?|joy cons?|dock)\b/.test(title);
  return (!gameOnly || hardwareEvidence) && !incompleteHardware;
}

export function matchesModel(item: EbayItemSummary, product: Product) {
  const title = item.title ?? "";
  const selectedMatches = modelEvidence(product).filter((value) => containsEvidence(title, value));
  if (!selectedMatches.length) return false;
  if (product.category === "Smartphone") {
    const selectedDescriptor = compact([product.name, ...(product.aliases ?? [])].join(" "));
    const titleText = compact(title);
    const modifiers = ["pro max", "pro xl", "ultra", "plus", "air", "fold", " pro ", " max "];
    if (modifiers.some((modifier) => titleText.includes(modifier.trim()) && !selectedDescriptor.includes(modifier.trim()))) return false;
    if (/\biphone\s+\d+\s*e\b/.test(titleText) && !/\biphone\s+\d+\s*e\b/.test(selectedDescriptor)) return false;
  }
  const selectedSpecificity = Math.max(...selectedMatches.map((value) => condensed(value).length));
  return !products.filter((candidate) => candidate.id !== product.id && candidate.brand === product.brand && candidate.category === product.category)
    .some((sibling) => modelEvidence(sibling).filter((value) => value.split(" ").length >= 2 && containsEvidence(title, value))
      .some((value) => condensed(value).length > selectedSpecificity));
}

function storageInGb(storage?: string) {
  const match = storage?.toLowerCase().replace(/\s/g, "").match(/^(\d+)(tb|gb)$/);
  return match ? Number(match[1]) * (match[2] === "tb" ? 1024 : 1) : null;
}
function observedStorage(value?: string) {
  return [...compact(value ?? "").matchAll(/\b(\d+)\s*(tb|gb)\b/g)].map((match) => Number(match[1]) * (match[2] === "tb" ? 1024 : 1)).filter((size) => validStorageSizes.has(size));
}
export function matchesStorage(item: EbayItemSummary, variant: ProductVariant) {
  const expected = storageInGb(variant.storage ?? variant.specifications.storage);
  if (expected === null) return true;
  const titleSizes = observedStorage(item.title);
  const observed = titleSizes.length ? titleSizes : observedStorage(ebayItemText(item));
  return observed.includes(expected) && observed.every((size) => size === expected);
}

function matchesSpecification(text: string, key: string, value: string) {
  if (key === "storage") return true;
  const normalized = compact(value);
  if (!normalized) return true;
  if (key === "ram") return new RegExp(`\\b${normalized.replace(" ", "\\s*")}\\b`).test(compact(text));
  if (key === "edition" && normalized === "disc") return /\b(disc|disk)\b/.test(compact(text)) && !/\bdigital\b/.test(compact(text));
  if (key === "edition" && normalized === "digital") return /\bdigital\b/.test(compact(text));
  if (key === "model" && normalized === "standard") return !/\b(anc|active noise cancellation|active noise cancelling)\b/.test(compact(text));
  if (normalized === "standard") return true;
  if (key === "model" && normalized === "anc") return /\b(anc|active noise cancellation|active noise cancelling)\b/.test(compact(text));
  return containsEvidence(text, normalized);
}
export function matchesVariantAttributes(item: EbayItemSummary, variant: ProductVariant) {
  const text = ebayItemText(item);
  return matchesStorage(item, variant) && Object.entries(variant.specifications).every(([key, value]) => matchesSpecification(text, key, value));
}
export function matchesProductCategory(item: EbayItemSummary, product: Product) {
  const names = (item.categories ?? []).map((category) => compact(category.categoryName ?? "")).filter(Boolean);
  const expected = categoryEvidence[product.category] ?? [];
  return !names.length || !expected.length || names.some((name) => expected.some((term) => name.includes(term)));
}
export function matchesPhoneCategory(item: EbayItemSummary) { return matchesProductCategory(item, { category: "Smartphone" } as Product); }
export function matchesStructuredIdentifier(item: EbayItemSummary, product: Product, variant: ProductVariant): boolean | null {
  const expected = variant.identifiers.epid ?? product.identifiers.epid;
  return !expected || !item.epid ? null : compact(item.epid) === compact(expected);
}
export function matchesCondition(item: EbayItemSummary, condition: ConditionFilter) { const normalized = normalizeEbayCondition(item.conditionId, item.condition); return normalized !== null && (condition === "any" || normalized === condition); }
export function isFixedPrice(item: EbayItemSummary) { return item.buyingOptions?.includes("FIXED_PRICE") === true; }
export function isActiveListing(item: EbayItemSummary, now = Date.now()) { return !item.itemEndDate || (!Number.isNaN(Date.parse(item.itemEndDate)) && Date.parse(item.itemEndDate) > now); }
export function matchesUnlockedStatus(item: EbayItemSummary, product: Product) {
  if (product.category !== "Smartphone") return true;
  const title = itemTitle(item);
  if (title.includes("locked") && !title.includes("unlocked")) return false;
  return !carrierPatterns.some((carrier) => carrier.test(title)) || title.includes("unlocked");
}
export function matchesVariant(item: EbayItemSummary, product: Product, variant: ProductVariant, condition: ConditionFilter) {
  if (!item.itemId || !item.title || !ebayItemText(item) || isAccessory(item) || isPartsOnly(item) || !matchesUnlockedStatus(item, product)) return false;
  if (matchesStructuredIdentifier(item, product, variant) === false) return false;
  return matchesModel(item, product) && matchesListingType(item, product) && matchesVariantAttributes(item, variant) && matchesProductCategory(item, product) && isFixedPrice(item) && isActiveListing(item) && matchesCondition(item, condition);
}
export function matchesCanonicalEbayItem(item: EbayItemSummary, product: Product, variant: ProductVariant, condition: ConditionFilter) { return matchesVariant(item, product, variant, condition); }
export function buildEbayQuery(product: Product, variant: ProductVariant) {
  const specs = Object.entries(variant.specifications).filter(([key, value]) => key !== "storage" && value && value !== "Standard").map(([, value]) => value);
  const listingIdentity = product.listingIdentities?.[0] ?? product.name;
  return [product.brand, listingIdentity, variant.storage, ...specs, product.category === "Smartphone" ? "unlocked" : null].filter(Boolean).join(" ");
}
export function ebayCategoryId(product: Product) { return ({ Smartphone: "9355", Laptop: "175672", Tablet: "171485", Wearable: "178893", Audio: "112529", Console: "139971" } as Record<string, string>)[product.category]; }

export function ebayBrowseConditionValues(condition: ConditionFilter) {
  if (condition === "new") return "NEW";
  if (condition === "refurbished") return "CERTIFIED_REFURBISHED|EXCELLENT_REFURBISHED|VERY_GOOD_REFURBISHED|GOOD_REFURBISHED|SELLER_REFURBISHED|MANUFACTURER_REFURBISHED";
  if (condition === "used") return "USED_EXCELLENT|USED_VERY_GOOD|USED_GOOD|USED_ACCEPTABLE";
  return null;
}

export function ebayBrowseSearchFilter(condition: ConditionFilter) {
  const parts = ["buyingOptions:{FIXED_PRICE}", "deliveryCountry:US"];
  const conditions = ebayBrowseConditionValues(condition);
  if (conditions) parts.push(`conditions:{${conditions}}`);
  return parts.join(",");
}

export function estimatedEbayKnownTotal(item: EbayItemSummary) {
  const price = Number(item.price?.value);
  const shipping = (item.shippingOptions ?? []).map((option) => Number(option.shippingCost?.value)).filter(Number.isFinite);
  return Number.isFinite(price) && shipping.length ? price + Math.min(...shipping) : Number.POSITIVE_INFINITY;
}

export function selectEbayDetailCandidates(items: EbayItemSummary[], limit: number) {
  const missingShipping = items.filter((item) => !Number.isFinite(estimatedEbayKnownTotal(item)));
  const withShipping = items
    .filter((item) => Number.isFinite(estimatedEbayKnownTotal(item)))
    .sort((a, b) => estimatedEbayKnownTotal(a) - estimatedEbayKnownTotal(b));
  const selected: EbayItemSummary[] = [];
  const seen = new Set<string>();
  for (const item of [...missingShipping, ...withShipping]) {
    if (!item.itemId || seen.has(item.itemId) || selected.length >= limit) continue;
    seen.add(item.itemId);
    selected.push(item);
  }
  return selected;
}
