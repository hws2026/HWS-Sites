CREATE TABLE `billing_accounts` (
	`customer_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`stripe_customer_id` text
);
--> statement-breakpoint
CREATE TABLE `billing_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`interval` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`stripe_subscription_id` text,
	`stripe_session_id` text,
	`session_url` text,
	`session_expires` integer DEFAULT 0 NOT NULL,
	`checkout_key` text,
	`cancel_at_period_end` integer DEFAULT 0 NOT NULL,
	`last_event_created` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_owner` ON `billing_agreements` (`owner`);--> statement-breakpoint
CREATE INDEX `billing_customer` ON `billing_agreements` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_subscription` ON `billing_agreements` (`stripe_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_session` ON `billing_agreements` (`stripe_session_id`);--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`agreement_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`invoice_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_customer` ON `billing_payments` (`customer_id`);--> statement-breakpoint
CREATE TABLE `site_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`owner` text NOT NULL,
	`hostname` text NOT NULL,
	`verification_token` text NOT NULL,
	`status` text DEFAULT 'pending_dns' NOT NULL,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`verified_at` text,
	`cloudflare_id` text,
	`ssl_status` text DEFAULT 'pending' NOT NULL,
	`hostname_status` text DEFAULT 'pending' NOT NULL,
	`validation_records` text DEFAULT '[]' NOT NULL,
	`last_error` text,
	`checked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_hostname` ON `site_domains` (`hostname`);--> statement-breakpoint
CREATE INDEX `domain_site` ON `site_domains` (`site_id`);--> statement-breakpoint
CREATE TABLE `site_publications` (
	`site_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL
);
