ALTER TABLE "diary_entries" ADD COLUMN "fiber" real;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "sugar" real;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "fiber" real;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "sugar" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "add_steps_kcal" boolean DEFAULT false NOT NULL;