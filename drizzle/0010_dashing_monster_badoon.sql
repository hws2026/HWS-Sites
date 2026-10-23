CREATE TABLE `suite_security_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`onboarding_enabled` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
