ALTER TABLE `policy_acceptances` ADD `owner` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `policy_owner_time` ON `policy_acceptances` (`owner`,`accepted_at`);