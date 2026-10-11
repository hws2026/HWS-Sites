CREATE TABLE `reminder_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`customer_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`next_at` text NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`last_sent_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `reminders_due` ON `reminders` (`enabled`,`next_at`);--> statement-breakpoint
CREATE INDEX `reminders_owner` ON `reminders` (`owner`);