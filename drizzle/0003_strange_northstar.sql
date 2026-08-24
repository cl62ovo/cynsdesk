CREATE TABLE `entry_files` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_files_object_key_unique` ON `entry_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_entry_files_entry_order` ON `entry_files` (`entry_id`,`sort_order`);