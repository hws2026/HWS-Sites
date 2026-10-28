CREATE TABLE `form_connections` (
	`site_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`endpoint` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`tested_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `form_deliveries` (
	`submission_id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`connection_revision` integer NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`accepted_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `form_delivery_due` ON `form_deliveries` (`status`,`next_at`);--> statement-breakpoint
CREATE INDEX `form_delivery_site` ON `form_deliveries` (`site_id`,`created_at`);