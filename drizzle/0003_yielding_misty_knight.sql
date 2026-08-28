CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`product_slug` text,
	`variant_id` text,
	`condition` text,
	`offer_id` text,
	`query` text,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_time_idx` ON `analytics_events` (`event_name`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_product_time_idx` ON `analytics_events` (`product_slug`,`occurred_at`);