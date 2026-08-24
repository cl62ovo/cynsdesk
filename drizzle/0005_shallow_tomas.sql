CREATE TABLE `memory_recaps` (
	`id` text PRIMARY KEY NOT NULL,
	`granularity` text NOT NULL,
	`period_key` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`content_fingerprint` text NOT NULL,
	`reflection` text NOT NULL,
	`evidence_entry_ids` text NOT NULL,
	`generated_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memory_recaps_period` ON `memory_recaps` (`granularity`,`period_key`);