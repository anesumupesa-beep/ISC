CREATE TYPE "public"."enquiry_status" AS ENUM('Submitted', 'Acknowledged', 'Referred to Counsellor');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'isc_admin', 'welfare_staff');--> statement-breakpoint
CREATE TYPE "public"."update_category" AS ENUM('Official Announcements', 'Events', 'Weather & Holidays', 'ISC Membership');--> statement-breakpoint
CREATE SEQUENCE "public"."welfare_enquiry_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 15 CACHE 1;--> statement-breakpoint
CREATE TABLE "arrival_progress" (
	"user_id" text NOT NULL,
	"task_id" integer NOT NULL,
	CONSTRAINT "arrival_progress_user_id_task_id_pk" PRIMARY KEY("user_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "arrival_tasks" (
	"id" integer PRIMARY KEY NOT NULL,
	"section" integer NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"documents" text NOT NULL,
	"link" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buddy_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"language" text NOT NULL,
	"arrival" date NOT NULL,
	"programme" text NOT NULL,
	"help" text[] DEFAULT '{}'::text[] NOT NULL,
	"volunteer_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "update_category" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"meta" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housing_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"user_id" text,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"area" text NOT NULL,
	"type" text NOT NULL,
	"price" integer NOT NULL,
	"walk" text NOT NULL,
	"includes" text NOT NULL,
	"checked_at" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"programme" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"programme" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"user_id" text NOT NULL,
	"update_id" integer NOT NULL,
	CONSTRAINT "rsvps_user_id_update_id_pk" PRIMARY KEY("user_id","update_id")
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"course" text NOT NULL,
	"languages" text NOT NULL,
	"email" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	CONSTRAINT "volunteers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "welfare_enquiries" (
	"id" text PRIMARY KEY DEFAULT 'WLF-' || to_char(now() at time zone 'Indian/Mauritius', 'YYYY') || '-' || lpad(nextval('welfare_enquiry_seq')::text, 3, '0') NOT NULL,
	"user_id" text,
	"category" text NOT NULL,
	"urgency" text NOT NULL,
	"description" text NOT NULL,
	"contact" text NOT NULL,
	"status" "enquiry_status" DEFAULT 'Submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arrival_progress" ADD CONSTRAINT "arrival_progress_task_id_arrival_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."arrival_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD CONSTRAINT "buddy_requests_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housing_reports" ADD CONSTRAINT "housing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_update_id_club_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."club_updates"("id") ON DELETE cascade ON UPDATE no action;