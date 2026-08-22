export type EbayAmount = { value?: string; currency?: string };
export type EbayCategory = { categoryId?: string; categoryName?: string };
export type EbaySeller = {
  username?: string;
  feedbackPercentage?: string;
  feedbackScore?: number;
};
export type EbayShippingOption = {
  shippingCost?: EbayAmount;
  shippingCostType?: string;
  minEstimatedDeliveryDate?: string;
  maxEstimatedDeliveryDate?: string;
};
export type EbayItemSummary = {
  itemId?: string;
  legacyItemId?: string;
  title?: string;
  shortDescription?: string;
  price?: EbayAmount;
  condition?: string;
  conditionId?: string;
  buyingOptions?: string[];
  categories?: EbayCategory[];
  leafCategoryIds?: string[];
  epid?: string;
  image?: { imageUrl?: string };
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  itemEndDate?: string;
  itemLocation?: { city?: string; stateOrProvince?: string; country?: string };
  listingMarketplaceId?: string;
  seller?: EbaySeller;
  shippingOptions?: EbayShippingOption[];
  topRatedBuyingExperience?: boolean;
};
export type EbaySearchResponse = {
  total?: number;
  itemSummaries?: EbayItemSummary[];
  warnings?: Array<{ errorId?: number; message?: string }>;
};
export type EbayTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

