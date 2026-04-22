CREATE TABLE `sdk_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`language` enum('typescript','python') NOT NULL,
	`version` varchar(32) NOT NULL,
	`download_url` text NOT NULL,
	`filename` varchar(255) NOT NULL,
	`size_kb` int NOT NULL,
	`spec_hash` varchar(64) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_by` varchar(255),
	`build_log` text,
	CONSTRAINT `sdk_meta_id` PRIMARY KEY(`id`)
);
