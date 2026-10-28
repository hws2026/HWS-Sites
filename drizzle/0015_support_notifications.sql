CREATE TABLE `support_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_error` text,
	`provider_id` text
);
--> statement-breakpoint
CREATE INDEX `support_notice_due` ON `support_notifications` (`status`,`next_at`);--> statement-breakpoint
CREATE INDEX `support_notice_thread` ON `support_notifications` (`thread_id`);