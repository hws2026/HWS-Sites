CREATE TABLE `template_catalog` (
	`template_id` text PRIMARY KEY NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);

--> statement-breakpoint
UPDATE client_sites SET template_id=json_extract(draft,'$.templateId')
WHERE json_valid(draft) AND json_type(draft,'$.templateId')='text' AND length(json_extract(draft,'$.templateId')) BETWEEN 1 AND 100;
