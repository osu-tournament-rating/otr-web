DROP INDEX "ix_games_osu_id";--> statement-breakpoint
DROP INDEX "ix_matches_osu_id";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "is_lazer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "is_lazer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ix_games_match_id_osu_id" ON "games" USING btree ("match_id" int4_ops,"osu_id" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_matches_osu_id_is_lazer" ON "matches" USING btree ("osu_id" int8_ops,"is_lazer" bool_ops);