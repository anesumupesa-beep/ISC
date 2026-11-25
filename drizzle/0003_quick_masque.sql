CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_approval', 'published', 'archived');--> statement-breakpoint
CREATE SEQUENCE "public"."arrival_task_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE TABLE "content_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"detached_at" timestamp with time zone,
	CONSTRAINT "content_media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"version" integer NOT NULL,
	"action" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"changed_by" text NOT NULL,
	"changed_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"heading" text NOT NULL,
	"body" text NOT NULL,
	"link_label" text,
	"link_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "arrival_tasks" ALTER COLUMN "id" SET DEFAULT nextval('arrival_task_seq');--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "status" "content_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "arrival_tasks" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "venue" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "link_label" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "link_url" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "approval_ref" text;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "status" "content_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "club_updates" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "status" "content_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "updated_by" text;--> statement-breakpoint
CREATE INDEX "content_media_entity_idx" ON "content_media" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "content_revisions_entity_idx" ON "content_revisions" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
UPDATE "arrival_tasks" SET "position" = "id" * 10;--> statement-breakpoint
UPDATE "listings" SET "is_sample" = true;--> statement-breakpoint
UPDATE "club_updates" SET "is_sample" = true;
