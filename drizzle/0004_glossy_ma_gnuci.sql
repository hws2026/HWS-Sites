CREATE TABLE `form_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`site_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`content` blob NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_attachment_submission` ON `form_attachments` (`submission_id`);--> statement-breakpoint
CREATE TABLE `form_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_rate_expiry` ON `form_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`page_id` text NOT NULL,
	`page_name` text NOT NULL,
	`form_id` text NOT NULL,
	`form_name` text NOT NULL,
	`request_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`answers` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `form_request` ON `form_submissions` (`site_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `form_site_received` ON `form_submissions` (`site_id`,`created_at`,`id`);