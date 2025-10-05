DROP INDEX "ix_player_ratings_ruleset_rating";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', "matches"."name"), 'A') || setweight(to_tsvector('simple', regexp_replace("matches"."name", '([A-Za-z]+)([0-9]+)', '\1 \2', 'g')), 'B')) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', "players"."username"), 'A')) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', "tournaments"."name"), 'A') || setweight(to_tsvector('simple', regexp_replace("tournaments"."name", '([A-Za-z]+)([0-9]+)', '\1 \2', 'g')), 'B') || setweight(to_tsvector('simple', "tournaments"."abbreviation"), 'A')) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_matches_search_vector" ON "matches" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "ix_matches_name_trgm" ON "matches" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_players_search_vector" ON "players" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "ix_players_username_trgm" ON "players" USING gin ("username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_tournaments_search_vector" ON "tournaments" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "ix_tournaments_name_trgm" ON "tournaments" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_tournaments_abbreviation_trgm" ON "tournaments" USING gin ("abbreviation" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_ruleset_rating" ON "player_ratings" USING btree ("ruleset" int4_ops,"rating" float8_ops);