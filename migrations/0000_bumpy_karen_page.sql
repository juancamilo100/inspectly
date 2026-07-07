CREATE TABLE "bounties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"property_address" text NOT NULL,
	"staked_credits" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"fulfilled_by_user_id" varchar,
	"fulfilled_report_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"fulfilled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"report_id" integer,
	"bounty_id" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"report_id" integer NOT NULL,
	"credit_spent" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"address" text NOT NULL,
	"city" text,
	"state" text,
	"zip_code" text,
	"latitude" text,
	"longitude" text,
	"status" text DEFAULT 'watching' NOT NULL,
	"notes" text,
	"purchase_price" integer,
	"offer_amount" integer,
	"closing_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"property_address" text NOT NULL,
	"inspection_date" timestamp,
	"file_hash" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"major_defects" jsonb,
	"summary_findings" text,
	"negotiation_points" jsonb,
	"estimated_credit" integer,
	"analysis_json" jsonb,
	"is_redacted" boolean DEFAULT false,
	"is_public" boolean DEFAULT true,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "reports_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");