CREATE TABLE "admin_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"invited_by_name" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invites_token_idx" ON "admin_invites" USING btree ("token_hash");