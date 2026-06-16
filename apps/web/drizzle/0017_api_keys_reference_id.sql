-- Better Auth's api-key plugin (v1.6+, @better-auth/api-key) replaced `user_id`
-- with `reference_id` and added a `config_id` discriminator used during key
-- hashing/verification. Existing keys were created against the old schema, so we
-- add the new columns and backfill `reference_id` from `user_id` before enforcing
-- NOT NULL — otherwise every previously-issued key fails verification.
ALTER TABLE "api_keys" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "reference_id" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
UPDATE "api_keys" SET "reference_id" = "user_id" WHERE "reference_id" IS NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "reference_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_reference_id_auth_users_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_api_keys_reference_id" ON "api_keys" USING btree ("reference_id" text_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_game_audits_changes_gin" ON "game_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_game_score_audits_changes_gin" ON "game_score_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_match_audits_changes_gin" ON "match_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_tournament_audits_changes_gin" ON "tournament_audits" USING gin ("changes" jsonb_path_ops);
