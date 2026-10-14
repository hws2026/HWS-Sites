CREATE TABLE `reminder_rules` (
	`owner` text PRIMARY KEY NOT NULL,
	`onboarding_enabled` integer DEFAULT 0 NOT NULL,
	`event_enabled` integer DEFAULT 0 NOT NULL,
	`onboarding_days` integer DEFAULT 7 NOT NULL,
	`event_hours` integer DEFAULT 24 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `reminders` ADD `source` text;