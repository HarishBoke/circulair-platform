CREATE TABLE `consent_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fingerprint` varchar(64),
	`level` enum('all','essential','rejected') NOT NULL,
	`analytics` boolean NOT NULL DEFAULT false,
	`marketing` boolean NOT NULL DEFAULT false,
	`essential` boolean NOT NULL DEFAULT true,
	`userAgent` text,
	`ipHash` varchar(64),
	`source` enum('banner','settings','withdraw') NOT NULL DEFAULT 'banner',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_logs_id` PRIMARY KEY(`id`)
);
