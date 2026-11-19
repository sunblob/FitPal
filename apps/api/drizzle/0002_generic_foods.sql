ALTER TABLE "foods" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "aliases" text;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "search_text" text;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_external_id_unique" UNIQUE("external_id");