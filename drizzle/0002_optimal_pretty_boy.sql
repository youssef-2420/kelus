CREATE TABLE `product_intelligence_snapshots` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`canonical_product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`condition` text NOT NULL,
	`market` text NOT NULL,
	`result_json` text NOT NULL,
	`fetched_at` text NOT NULL,
	`updated_at` text NOT NULL
);
