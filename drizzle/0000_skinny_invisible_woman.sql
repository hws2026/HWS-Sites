CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`site_id` text,
	`description` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_owner_time` ON `activity` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `client_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`template_id` text NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_owner` ON `client_sites` (`owner`);--> statement-breakpoint
CREATE INDEX `site_customer` ON `client_sites` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_owner` ON `customers` (`owner`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`site_id` text NOT NULL,
	`filename` text NOT NULL,
	`key` text NOT NULL,
	`content_type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_site` ON `media` (`site_id`);--> statement-breakpoint
CREATE TABLE `site_access` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`site_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_access_email` ON `site_access` (`site_id`,`email`);--> statement-breakpoint
CREATE INDEX `access_user` ON `site_access` (`user_id`);--> statement-breakpoint
CREATE INDEX `access_email` ON `site_access` (`email`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_owner` ON `workspaces` (`owner`);