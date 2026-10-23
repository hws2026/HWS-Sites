CREATE TABLE `customer_accounts` (
	`customer_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`must_change` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`sent_at` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `customer_templates` (
	`customer_id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `honeybook_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`site_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `policy_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`policy_id` text NOT NULL,
	`version` text NOT NULL,
	`accepted_at` text NOT NULL,
	`context` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_user_version` ON `policy_acceptances` (`user_id`,`policy_id`,`version`);--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`outcome` text NOT NULL,
	`target` text NOT NULL,
	`status` integer NOT NULL,
	`created_at` text NOT NULL,
	`context` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_owner_time` ON `security_events` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`actor` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `message_thread` ON `support_messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `support_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_customer` ON `support_threads` (`customer_id`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_email` ON `team_members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_user` ON `team_members` (`user_id`);