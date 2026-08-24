CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_slug` text NOT NULL,
	`title` text,
	`entry_date` text,
	`short_text` text,
	`long_text` text,
	`note` text,
	`is_published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_entries_session_published_date` ON `entries` (`session_slug`,`is_published`,`entry_date`);--> statement-breakpoint
CREATE TABLE `entry_images` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`alt_text` text,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_images_object_key_unique` ON `entry_images` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_entry_images_entry_order` ON `entry_images` (`entry_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `site_owner` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`claimed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_owner_user_id_unique` ON `site_owner` (`user_id`);