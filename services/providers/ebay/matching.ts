import type { ConditionFilter, OfferCondition, Product, ProductVariant } from "@/types/kelus";
import type { EbayItemSummary } from "@/services/providers/ebay/types";

const accessoryTerms = [
  "case", "cover", "charger", "charging cable", "screen protector", "replacement screen",
  "tempered glass", "camera lens protector", "lcd", "digitizer", "box only", "empty box", "dummy",
  "display model", "display only", "housing", "back glass", "logic board", "motherboard", "sim tray",
  "flex cable", "phone skin", "wallet case", "holster", "bumper", "car mount", "replica", "mockup",
];
const partsTerms = ["for parts", "parts only", "repair", "broken", "cracked", "not working", "as is"];
const carrierTerms = ["verizon", "at t", "tmobile", "t mobile", "sprint", "cricket", "boost mobile", "straight talk", "us cellular"];
const phoneStorageSizes = new Set([64, 128, 256, 512, 1024, 2048]);

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const itemTitle = (item: EbayItemSummary) => compact(item.title ?? "");

export function normalizeEbayCondition(conditionId?: string, conditionText?: string): OfferCondition | null {
  const id = conditionId?.trim();
  if (id === "1000" || id === "1500") return "new";
  if (["2000", "2010", "2020", "2030", "2500"].includes(id ?? "")) return "refurbished";
  if (["3000", "4000", "5000", "6000", "7000"].includes(id ?? "")) return "used";
  const text = compact(conditionText ?? "");
  if (!text) return null;
  if (text.includes("refurbished") || text.includes("renewed")) return "refurbished";
  if (text.startsWith("new") || text.includes("open box")) return "new";
  if (text.includes("used") || text.includes("pre owned") || text.includes("preowned")) return "used";
  return null;
}

export function ebayItemText(item: EbayItemSummary) {
  return compact([item.title, item.shortDescription].filter(Boolean).join(" "));
}

export function isAccessory(item: EbayItemSummary) {
  const title = itemTitle(item);
  return accessoryTerms.some((term) => title.includes(term));
}

export function isPartsOnly(item: EbayItemSummary) {
  const text = ebayItemText(item);
  return partsTerms.some((term) => text.includes(term));
}

export function matchesModel(item: EbayItemSummary, product: Product) {
  const text = itemTitle(item);
  if (!text.includes("iphone 17")) return false;
  if (product.slug === "iphone-17-pro-max") return text.includes("iphone 17 pro max");
  if (product.slug === "iphone-17-pro") return text.includes("iphone 17 pro") && !text.includes("iphone 17 pro max");
  if (product.slug === "iphone-17") return !["iphone 17 pro", "iphone 17 max", "iphone 17 air", "iphone 17 plus", "iphone 17e", "iphone 17 e"].some((model) => text.includes(model));
  return false;
}

function storageInGb(storage?: string) {
  const match = storage?.toLowerCase().replace(/\s/g, "").match(/^(\d+)(tb|gb)$/);
  if (!match) return null;
  return Number(match[1]) * (match[2] === "tb" ? 1024 : 1);
}

function storageSizes(value?: string) {
  const sizes = [...compact(value ?? "").matchAll(/\b(\d+)\s*(tb|gb)\b/g)].map((match) => Number(match[1]) * (match[2] === "tb" ? 1024 : 1));
  return [...new Set(sizes.filter((size) => phoneStorageSizes.has(size)))];
}

export function matchesStorage(item: EbayItemSummary, variant: ProductVariant) {
  const expected = storageInGb(variant.storage);
  if (expected === null) return false;
  const titleSizes = storageSizes(item.title);
  const observed = titleSizes.length ? titleSizes : storageSizes(ebayItemText(item));
  return observed.includes(expected) && observed.every((size) => size === expected);
}

export function matchesPhoneCategory(item: EbayItemSummary) {
  const ids = [...(item.leafCategoryIds ?? []), ...(item.categories ?? []).map((category) => category.categoryId ?? "")];
  if (ids.includes("9355")) return true;
  const names = (item.categories ?? []).map((category) => compact(category.categoryName ?? ""));
  return !names.length || names.some((name) => name.includes("cell phone") || name.includes("smartphone"));
}

export function matchesStructuredIdentifier(item: EbayItemSummary, product: Product, variant: ProductVariant): boolean | null {
  const expected = variant.identifiers.epid ?? product.identifiers.epid;
  if (!expected || !item.epid) return null;
  return compact(item.epid) === compact(expected);
}

export function matchesCondition(item: EbayItemSummary, condition: ConditionFilter) {
  const normalized = normalizeEbayCondition(item.conditionId, item.condition);
  return normalized !== null && (condition === "any" || normalized === condition);
}

export function isFixedPrice(item: EbayItemSummary) {
  return item.buyingOptions?.includes("FIXED_PRICE") === true;
}

export function isActiveListing(item: EbayItemSummary, now = Date.now()) {
  return !item.itemEndDate || (!Number.isNaN(Date.parse(item.itemEndDate)) && Date.parse(item.itemEndDate) > now);
}

export function matchesVariant(item: EbayItemSummary, product: Product, variant: ProductVariant, condition: ConditionFilter) {
  const text = ebayItemText(item);
  const title = itemTitle(item);
  if (!item.itemId || !item.title || !text) return false;
  if (isAccessory(item) || isPartsOnly(item)) return false;
  if (title.includes("locked") && !title.includes("unlocked")) return false;
  if (!title.includes("unlocked") && carrierTerms.some((carrier) => title.includes(carrier))) return false;
  if (matchesStructuredIdentifier(item, product, variant) === false) return false;
  return matchesModel(item, product)
    && matchesStorage(item, variant)
    && matchesPhoneCategory(item)
    && isFixedPrice(item)
    && isActiveListing(item)
    && matchesCondition(item, condition);
}

export function matchesCanonicalEbayItem(item: EbayItemSummary, product: Product, variant: ProductVariant, condition: ConditionFilter) {
  return matchesVariant(item, product, variant, condition);
}

export function buildEbayQuery(product: Product, variant: ProductVariant) {
  return [product.brand, product.name, variant.storage, "unlocked"].filter(Boolean).join(" ");
}
