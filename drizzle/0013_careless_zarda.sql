CREATE TABLE `security_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`actor` text NOT NULL,
	`scope` text NOT NULL,
	`reason` text NOT NULL,
	`opened_at` text NOT NULL,
	`acknowledged_at` text,
	`resolved_at` text,
	`active_key` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incident_active` ON `security_incidents` (`active_key`);--> statement-breakpoint
CREATE INDEX `incident_owner` ON `security_incidents` (`owner`,`opened_at`);--> statement-breakpoint
CREATE TABLE `security_notifications` (
	`owner` text PRIMARY KEY NOT NULL,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`last_sent_at` integer,
	`last_error` text,
	`delivery_key` text,
	`delivery_body` text
);
