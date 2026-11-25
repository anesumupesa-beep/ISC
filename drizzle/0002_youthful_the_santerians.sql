CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"summary" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD COLUMN "assigned_by" text;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "housing_reports" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "housing_reports" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "housing_reports" ADD COLUMN "resolved_by" text;--> statement-breakpoint
ALTER TABLE "housing_reports" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
UPDATE "volunteers" SET "approved_at" = now(), "approved_by" = 'migration' WHERE "approved_at" IS NULL;
