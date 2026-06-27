CREATE TABLE "nextjs_app_schema"."calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"folder_id" integer,
	"event_date" date,
	"time" varchar(5),
	"end_time" varchar(5),
	"title" varchar(255),
	"notes" jsonb,
	"location" varchar(255),
	"reminders" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."summaries" DROP CONSTRAINT "summaries_folder_id_folders_id_fk";
--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "platform" varchar(16);--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "color_tag" varchar(8);--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "canvas" jsonb;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."folders" ADD COLUMN "plan" jsonb;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."summaries" ADD COLUMN "graph" jsonb;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."summaries" ADD COLUMN "status" varchar(12);--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."calendar_events" ADD CONSTRAINT "calendar_events_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "nextjs_app_schema"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nextjs_app_schema"."summaries" ADD CONSTRAINT "summaries_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "nextjs_app_schema"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "folders_user_client_idx" ON "nextjs_app_schema"."folders" USING btree ("user_id","client_id");