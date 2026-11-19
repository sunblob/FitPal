CREATE TYPE "public"."ai_request_kind" AS ENUM('photo', 'label', 'text', 'workout_plan', 'translation');--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" "ai_request_kind" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"ok" boolean NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_requests_created_idx" ON "ai_requests" USING btree ("created_at");--> statement-breakpoint
-- Чтобы статистика активности не начиналась с нуля
UPDATE "users" SET "last_seen_at" = "updated_at";
