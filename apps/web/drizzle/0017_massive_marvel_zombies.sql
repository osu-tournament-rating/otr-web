CREATE INDEX "ix_game_audits_changes_gin" ON "game_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_changes_gin" ON "game_score_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_changes_gin" ON "match_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_changes_gin" ON "tournament_audits" USING gin ("changes" jsonb_path_ops);