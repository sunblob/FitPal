CREATE TYPE "public"."language" AS ENUM('en', 'ru');--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "name_en" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" "language" DEFAULT 'en' NOT NULL;--> statement-breakpoint
-- Кто уже пользуется ботом, видел его только на русском: оставляем им русский.
UPDATE "users" SET "language" = 'ru';
