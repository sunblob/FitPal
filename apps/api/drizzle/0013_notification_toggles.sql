ALTER TABLE "users" ADD COLUMN "daily_reminder" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weekly_summary" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Раньше «не напоминать» хранилось как reminder_hour = null: переносим это в новые флаги
UPDATE "users" SET "daily_reminder" = false, "weekly_summary" = false, "reminder_hour" = 20 WHERE "reminder_hour" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "reminder_hour" SET NOT NULL;
