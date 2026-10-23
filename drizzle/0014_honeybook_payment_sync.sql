CREATE TABLE `honeybook_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`last_received_at` text,
	`last_test_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `honeybook_connection_site` ON `honeybook_connections` (`site_id`);--> statement-breakpoint
CREATE TABLE `honeybook_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`payment_key` text NOT NULL,
	`source` text NOT NULL,
	`payload` text NOT NULL,
	`voided` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `honeybook_payment_reference` ON `honeybook_payments` (`site_id`,`payment_key`);--> statement-breakpoint
CREATE INDEX `honeybook_payment_site` ON `honeybook_payments` (`site_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `honeybook_links` ADD `kind` text DEFAULT 'private_invoice' NOT NULL;