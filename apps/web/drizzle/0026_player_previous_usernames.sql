CREATE OR REPLACE FUNCTION public.join_text_array(parts text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(string_agg(part, ' '), '') FROM unnest(parts) AS part;
$$;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "previous_usernames" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', regexp_replace(coalesce("players"."username", ''), '[^[:alnum:]]+', ' ', 'g')), 'A') || setweight(to_tsvector('simple', regexp_replace(coalesce(join_text_array("players"."previous_usernames"), ''), '[^[:alnum:]]+', ' ', 'g')), 'B')) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_players_search_vector" ON "players" USING gin ("search_vector");
