CREATE TABLE `tutorial_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stepKey` varchar(128) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutorial_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wiki_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` varchar(128) NOT NULL,
	`articleTitle` varchar(256) NOT NULL,
	`feedbackType` enum('suggest_edit','flag_outdated','flag_inaccurate','request_topic','rate_helpful','rate_not_helpful','general') NOT NULL,
	`content` text,
	`suggestedContent` text,
	`section` varchar(256),
	`rating` int,
	`reviewStatus` enum('pending','approved','rejected','merged') NOT NULL DEFAULT 'pending',
	`reviewNotes` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`userId` int,
	`userName` varchar(256),
	`userEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wiki_feedback_id` PRIMARY KEY(`id`)
);
