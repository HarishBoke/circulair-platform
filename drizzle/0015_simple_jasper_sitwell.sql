CREATE TABLE `stripe_payment_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripe_payment_intent_id` varchar(64) NOT NULL,
	`stripe_session_id` varchar(128),
	`offer_id` int NOT NULL,
	`listing_id` int NOT NULL,
	`buyer_id` int NOT NULL,
	`seller_id` int NOT NULL,
	`payment_status` enum('pending','succeeded','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripe_payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_payment_intents_stripe_payment_intent_id_unique` UNIQUE(`stripe_payment_intent_id`)
);
