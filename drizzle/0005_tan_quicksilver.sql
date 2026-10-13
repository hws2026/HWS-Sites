ALTER TABLE `customers` ADD `archived` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO site_publications (site_id,owner,enabled) SELECT id,owner,1 FROM client_sites WHERE published IS NOT NULL AND archived=0;
