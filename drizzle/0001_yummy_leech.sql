CREATE TABLE "contact_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"company" varchar(255),
	"role" varchar(100),
	"message" text NOT NULL,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"ip_address" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
