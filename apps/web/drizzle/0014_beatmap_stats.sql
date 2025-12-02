-- Pre-computed beatmap statistics to eliminate correlated subqueries in beatmaps.list
-- Triggers maintain this table automatically when games/matches/tournaments change

CREATE TABLE IF NOT EXISTS "beatmap_stats" (
  "beatmap_id" integer PRIMARY KEY NOT NULL,
  "verified_game_count" integer DEFAULT 0 NOT NULL,
  "verified_tournament_count" integer DEFAULT 0 NOT NULL,
  "has_verified_appearance" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "beatmap_stats"
  ADD CONSTRAINT "beatmap_stats_beatmap_id_beatmaps_id_fk"
  FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "ix_beatmap_stats_verified_game_count"
  ON "beatmap_stats" USING btree ("verified_game_count" ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS "ix_beatmap_stats_verified_tournament_count"
  ON "beatmap_stats" USING btree ("verified_tournament_count" ASC NULLS LAST);


-- Recalculates stats for a single beatmap
-- verification_status = 4 = VerificationStatus.Verified
CREATE OR REPLACE FUNCTION public.refresh_beatmap_stats(p_beatmap_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_game_count INTEGER;
  v_tournament_count INTEGER;
BEGIN
  -- Count games where tournament + match + game are all verified
  SELECT COUNT(g.id) INTO v_game_count
  FROM games g
  INNER JOIN matches m ON m.id = g.match_id
  INNER JOIN tournaments t ON t.id = m.tournament_id
  WHERE g.beatmap_id = p_beatmap_id
    AND t.verification_status = 4
    AND m.verification_status = 4
    AND g.verification_status = 4;

  -- Count tournaments where beatmap was pooled OR played (deduplicated via UNION)
  SELECT COUNT(DISTINCT tournament_id) INTO v_tournament_count
  FROM (
    SELECT jpb.tournaments_pooled_in_id AS tournament_id
    FROM join_pooled_beatmaps jpb
    INNER JOIN tournaments t ON t.id = jpb.tournaments_pooled_in_id
    WHERE jpb.pooled_beatmaps_id = p_beatmap_id
      AND t.verification_status = 4

    UNION

    SELECT t.id AS tournament_id
    FROM games g
    INNER JOIN matches m ON m.id = g.match_id
    INNER JOIN tournaments t ON t.id = m.tournament_id
    WHERE g.beatmap_id = p_beatmap_id
      AND t.verification_status = 4
      AND m.verification_status = 4
      AND g.verification_status = 4
  ) AS combined_tournaments;

  INSERT INTO beatmap_stats (beatmap_id, verified_game_count, verified_tournament_count, has_verified_appearance, updated_at)
  VALUES (p_beatmap_id, v_game_count, v_tournament_count, (v_game_count > 0 OR v_tournament_count > 0), CURRENT_TIMESTAMP)
  ON CONFLICT (beatmap_id) DO UPDATE SET
    verified_game_count = EXCLUDED.verified_game_count,
    verified_tournament_count = EXCLUDED.verified_tournament_count,
    has_verified_appearance = EXCLUDED.has_verified_appearance,
    updated_at = EXCLUDED.updated_at;
END;
$$;


-- Refresh all beatmaps in a match
CREATE OR REPLACE FUNCTION public.refresh_beatmap_stats_for_match(p_match_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_beatmap_id INTEGER;
BEGIN
  FOR v_beatmap_id IN
    SELECT DISTINCT beatmap_id FROM games WHERE match_id = p_match_id AND beatmap_id IS NOT NULL
  LOOP
    PERFORM public.refresh_beatmap_stats(v_beatmap_id);
  END LOOP;
END;
$$;


-- Refresh all beatmaps in a tournament (played and pooled)
CREATE OR REPLACE FUNCTION public.refresh_beatmap_stats_for_tournament(p_tournament_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_beatmap_id INTEGER;
BEGIN
  FOR v_beatmap_id IN
    SELECT DISTINCT g.beatmap_id
    FROM games g
    INNER JOIN matches m ON m.id = g.match_id
    WHERE m.tournament_id = p_tournament_id AND g.beatmap_id IS NOT NULL

    UNION

    SELECT pooled_beatmaps_id FROM join_pooled_beatmaps WHERE tournaments_pooled_in_id = p_tournament_id
  LOOP
    PERFORM public.refresh_beatmap_stats(v_beatmap_id);
  END LOOP;
END;
$$;


-- Trigger: games table
CREATE OR REPLACE FUNCTION public.trg_games_beatmap_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.beatmap_id IS NOT NULL THEN
      PERFORM public.refresh_beatmap_stats(NEW.beatmap_id);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
       OR OLD.beatmap_id IS DISTINCT FROM NEW.beatmap_id THEN
      IF OLD.beatmap_id IS NOT NULL THEN
        PERFORM public.refresh_beatmap_stats(OLD.beatmap_id);
      END IF;
      IF NEW.beatmap_id IS NOT NULL AND NEW.beatmap_id IS DISTINCT FROM OLD.beatmap_id THEN
        PERFORM public.refresh_beatmap_stats(NEW.beatmap_id);
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.beatmap_id IS NOT NULL THEN
      PERFORM public.refresh_beatmap_stats(OLD.beatmap_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;


-- Trigger: matches table (UPDATE/DELETE only - new matches have no games)
CREATE OR REPLACE FUNCTION public.trg_matches_beatmap_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
      PERFORM public.refresh_beatmap_stats_for_match(NEW.id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_beatmap_stats_for_match(OLD.id);
  END IF;
  RETURN NULL;
END;
$$;


-- Trigger: tournaments table (UPDATE/DELETE only - new tournaments are empty)
CREATE OR REPLACE FUNCTION public.trg_tournaments_beatmap_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
      PERFORM public.refresh_beatmap_stats_for_tournament(NEW.id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_beatmap_stats_for_tournament(OLD.id);
  END IF;
  RETURN NULL;
END;
$$;


-- Trigger: join_pooled_beatmaps (INSERT/DELETE only - junction table)
CREATE OR REPLACE FUNCTION public.trg_join_pooled_beatmaps_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_beatmap_stats(NEW.pooled_beatmaps_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_beatmap_stats(OLD.pooled_beatmaps_id);
  END IF;
  RETURN NULL;
END;
$$;


-- Attach triggers
DROP TRIGGER IF EXISTS trg_games_beatmap_stats_update ON games;
CREATE TRIGGER trg_games_beatmap_stats_update
AFTER INSERT OR UPDATE OR DELETE ON games
FOR EACH ROW EXECUTE FUNCTION public.trg_games_beatmap_stats();

DROP TRIGGER IF EXISTS trg_matches_beatmap_stats_update ON matches;
CREATE TRIGGER trg_matches_beatmap_stats_update
AFTER UPDATE OR DELETE ON matches
FOR EACH ROW EXECUTE FUNCTION public.trg_matches_beatmap_stats();

DROP TRIGGER IF EXISTS trg_tournaments_beatmap_stats_update ON tournaments;
CREATE TRIGGER trg_tournaments_beatmap_stats_update
AFTER UPDATE OR DELETE ON tournaments
FOR EACH ROW EXECUTE FUNCTION public.trg_tournaments_beatmap_stats();

DROP TRIGGER IF EXISTS trg_join_pooled_beatmaps_stats_update ON join_pooled_beatmaps;
CREATE TRIGGER trg_join_pooled_beatmaps_stats_update
AFTER INSERT OR DELETE ON join_pooled_beatmaps
FOR EACH ROW EXECUTE FUNCTION public.trg_join_pooled_beatmaps_stats();


-- Initial population (idempotent via ON CONFLICT)
INSERT INTO beatmap_stats (beatmap_id, verified_game_count, verified_tournament_count, has_verified_appearance, updated_at)
SELECT
  b.id AS beatmap_id,
  COALESCE(game_counts.cnt, 0) AS verified_game_count,
  COALESCE(tournament_counts.cnt, 0) AS verified_tournament_count,
  (COALESCE(game_counts.cnt, 0) > 0 OR COALESCE(tournament_counts.cnt, 0) > 0) AS has_verified_appearance,
  CURRENT_TIMESTAMP AS updated_at
FROM beatmaps b
LEFT JOIN (
  SELECT g.beatmap_id, COUNT(*) AS cnt
  FROM games g
  INNER JOIN matches m ON m.id = g.match_id
  INNER JOIN tournaments t ON t.id = m.tournament_id
  WHERE t.verification_status = 4
    AND m.verification_status = 4
    AND g.verification_status = 4
  GROUP BY g.beatmap_id
) game_counts ON game_counts.beatmap_id = b.id
LEFT JOIN (
  SELECT beatmap_id, COUNT(DISTINCT tournament_id) AS cnt
  FROM (
    SELECT jpb.pooled_beatmaps_id AS beatmap_id, jpb.tournaments_pooled_in_id AS tournament_id
    FROM join_pooled_beatmaps jpb
    INNER JOIN tournaments t ON t.id = jpb.tournaments_pooled_in_id
    WHERE t.verification_status = 4

    UNION

    SELECT g.beatmap_id, t.id AS tournament_id
    FROM games g
    INNER JOIN matches m ON m.id = g.match_id
    INNER JOIN tournaments t ON t.id = m.tournament_id
    WHERE t.verification_status = 4
      AND m.verification_status = 4
      AND g.verification_status = 4
  ) combined
  GROUP BY beatmap_id
) tournament_counts ON tournament_counts.beatmap_id = b.id
WHERE b.data_fetch_status != 1
ON CONFLICT (beatmap_id) DO UPDATE SET
  verified_game_count = EXCLUDED.verified_game_count,
  verified_tournament_count = EXCLUDED.verified_tournament_count,
  has_verified_appearance = EXCLUDED.has_verified_appearance,
  updated_at = EXCLUDED.updated_at;


-- Composite indexes for query performance
CREATE INDEX IF NOT EXISTS ix_games_beatmap_verification
  ON games(beatmap_id, verification_status);

CREATE INDEX IF NOT EXISTS ix_game_scores_game_verification
  ON game_scores(game_id, verification_status);
