CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ru" text,
	"force" text,
	"level" text,
	"mechanic" text,
	"equipment" text,
	"category" text,
	"primary_muscles" text[] NOT NULL,
	"secondary_muscles" text[] NOT NULL,
	"instructions_en" jsonb NOT NULL,
	"instructions_ru" jsonb,
	"images" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"params" jsonb NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_primary_muscles_idx" ON "exercises" USING gin ("primary_muscles");--> statement-breakpoint
CREATE INDEX "workout_plans_user_idx" ON "workout_plans" USING btree ("user_id","created_at");