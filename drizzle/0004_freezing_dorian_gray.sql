ALTER TABLE `analytics_events` ADD `offer_count` integer;--> statement-breakpoint
CREATE INDEX `analytics_events_offer_outcome_idx` ON `analytics_events` (`event_name`,`offer_count`,`occurred_at`);