CREATE TABLE `price_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`retailer_id` text NOT NULL,
	`offer_id` text NOT NULL,
	`price_cents` integer NOT NULL,
	`shipping_cents` integer,
	`currency` text NOT NULL,
	`condition` text NOT NULL,
	`availability` text NOT NULL,
	`observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_observations_provider_offer_time_unique` ON `price_observations` (`provider_id`,`offer_id`,`observed_at`);--> statement-breakpoint
CREATE INDEX `price_observations_variant_time_idx` ON `price_observations` (`variant_id`,`observed_at`);