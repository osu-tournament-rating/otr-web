ALTER TABLE "data_reports" DROP CONSTRAINT "fk_data_reports_users_reporter_user_id";
--> statement-breakpoint
ALTER TABLE "game_admin_notes" DROP CONSTRAINT "fk_game_admin_notes_users_admin_user_id";
--> statement-breakpoint
ALTER TABLE "game_score_admin_notes" DROP CONSTRAINT "fk_game_score_admin_notes_users_admin_user_id";
--> statement-breakpoint
ALTER TABLE "match_admin_notes" DROP CONSTRAINT "fk_match_admin_notes_users_admin_user_id";
--> statement-breakpoint
ALTER TABLE "tournament_admin_notes" DROP CONSTRAINT "fk_tournament_admin_notes_users_admin_user_id";
--> statement-breakpoint
ALTER TABLE "data_reports" ALTER COLUMN "reporter_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_admin_notes" ALTER COLUMN "admin_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_score_admin_notes" ALTER COLUMN "admin_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "match_admin_notes" ALTER COLUMN "admin_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_admin_notes" ALTER COLUMN "admin_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "data_reports" ADD CONSTRAINT "fk_data_reports_users_reporter_user_id" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_admin_notes" ADD CONSTRAINT "fk_game_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score_admin_notes" ADD CONSTRAINT "fk_game_score_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_admin_notes" ADD CONSTRAINT "fk_match_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_admin_notes" ADD CONSTRAINT "fk_tournament_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;