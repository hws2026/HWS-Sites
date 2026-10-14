CREATE TABLE `merchant_accounts` (
	`customer_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`account_id` text,
	`live` integer NOT NULL,
	`charges_enabled` integer DEFAULT 0 NOT NULL,
	`details_submitted` integer DEFAULT 0 NOT NULL,
	`disconnected` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_account` ON `merchant_accounts` (`account_id`);--> statement-breakpoint
CREATE TABLE `merchant_events` (
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`site_id` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`interval` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offer_site` ON `payment_offers` (`site_id`);--> statement-breakpoint
CREATE TABLE `website_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`site_id` text NOT NULL,
	`offer_id` text NOT NULL,
	`request_id` text NOT NULL,
	`account_id` text NOT NULL,
	`live` integer NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`interval` text NOT NULL,
	`status` text NOT NULL,
	`session_id` text,
	`session_url` text,
	`expires` integer NOT NULL,
	`return_url` text NOT NULL,
	`subscription_id` text,
	`subscription_status` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website_order_request` ON `website_orders` (`site_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `website_order_session` ON `website_orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `website_order_customer` ON `website_orders` (`customer_id`);--> statement-breakpoint
CREATE TABLE `website_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`owner` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`receipt_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `website_payment_customer` ON `website_payments` (`customer_id`);