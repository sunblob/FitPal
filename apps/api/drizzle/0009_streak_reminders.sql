CREATE TABLE "closed_days" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "closed_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reminder_hour" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_reminder_on" date;--> statement-breakpoint
ALTER TABLE "closed_days" ADD CONSTRAINT "closed_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;