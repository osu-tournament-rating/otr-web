-- Repair rows left behind by cascades that never ran. Ordered parent to child so
-- a match rejected here reaches its games and scores in the same run.
ALTER TABLE "matches" DISABLE TRIGGER "trg_matches_audit";--> statement-breakpoint
ALTER TABLE "games" DISABLE TRIGGER "trg_games_audit";--> statement-breakpoint
ALTER TABLE "game_scores" DISABLE TRIGGER "trg_game_scores_audit";--> statement-breakpoint

UPDATE "matches" m
SET "verification_status" = 3,
    "rejection_reason" = m."rejection_reason" | 128
FROM "tournaments" t
WHERE m."tournament_id" = t."id"
  AND t."verification_status" = 3
  AND (m."verification_status" <> 3 OR (m."rejection_reason" & 128) = 0);--> statement-breakpoint

UPDATE "games" g
SET "verification_status" = 3,
    "rejection_reason" = g."rejection_reason" | 512
FROM "matches" m
WHERE g."match_id" = m."id"
  AND m."verification_status" = 3
  AND (g."verification_status" <> 3 OR (g."rejection_reason" & 512) = 0);--> statement-breakpoint

UPDATE "game_scores" s
SET "verification_status" = 3,
    "rejection_reason" = s."rejection_reason" | 8
FROM "games" g
WHERE s."game_id" = g."id"
  AND g."verification_status" = 3
  AND (s."verification_status" <> 3 OR (s."rejection_reason" & 8) = 0);--> statement-breakpoint

ALTER TABLE "matches" ENABLE TRIGGER "trg_matches_audit";--> statement-breakpoint
ALTER TABLE "games" ENABLE TRIGGER "trg_games_audit";--> statement-breakpoint
ALTER TABLE "game_scores" ENABLE TRIGGER "trg_game_scores_audit";--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.check_tournament_verification_inheritance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status = 3 AND EXISTS (
    SELECT 1 FROM matches WHERE tournament_id = NEW.id AND verification_status = 4
  ) THEN
    RAISE EXCEPTION 'A rejected tournament cannot contain verified matches'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'tournaments_verification_inheritance';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.check_match_verification_inheritance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status = 4 AND EXISTS (
    SELECT 1 FROM tournaments WHERE id = NEW.tournament_id AND verification_status = 3
  ) THEN
    RAISE EXCEPTION 'A match cannot be verified while its tournament is rejected'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'matches_verification_inheritance';
  END IF;

  IF NEW.verification_status = 3 AND EXISTS (
    SELECT 1 FROM games WHERE match_id = NEW.id AND verification_status = 4
  ) THEN
    RAISE EXCEPTION 'A rejected match cannot contain verified games'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'matches_verification_inheritance';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.check_game_verification_inheritance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status = 4 AND EXISTS (
    SELECT 1 FROM matches WHERE id = NEW.match_id AND verification_status = 3
  ) THEN
    RAISE EXCEPTION 'A game cannot be verified while its match is rejected'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'games_verification_inheritance';
  END IF;

  IF NEW.verification_status = 3 AND EXISTS (
    SELECT 1 FROM game_scores WHERE game_id = NEW.id AND verification_status = 4
  ) THEN
    RAISE EXCEPTION 'A rejected game cannot contain verified scores'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'games_verification_inheritance';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.check_game_score_verification_inheritance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status = 4 AND EXISTS (
    SELECT 1 FROM games WHERE id = NEW.game_id AND verification_status = 3
  ) THEN
    RAISE EXCEPTION 'A score cannot be verified while its game is rejected'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'game_scores_verification_inheritance';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_tournaments_verification_inheritance ON tournaments;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_tournaments_verification_inheritance
AFTER INSERT OR UPDATE OF verification_status ON tournaments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.verification_status = 3)
EXECUTE FUNCTION public.check_tournament_verification_inheritance();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_matches_verification_inheritance ON matches;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_matches_verification_inheritance
AFTER INSERT OR UPDATE OF verification_status ON matches
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.verification_status IN (3, 4))
EXECUTE FUNCTION public.check_match_verification_inheritance();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_games_verification_inheritance ON games;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_games_verification_inheritance
AFTER INSERT OR UPDATE OF verification_status ON games
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.verification_status IN (3, 4))
EXECUTE FUNCTION public.check_game_verification_inheritance();--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_game_scores_verification_inheritance ON game_scores;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_game_scores_verification_inheritance
AFTER INSERT OR UPDATE OF verification_status ON game_scores
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (NEW.verification_status = 4)
EXECUTE FUNCTION public.check_game_score_verification_inheritance();
