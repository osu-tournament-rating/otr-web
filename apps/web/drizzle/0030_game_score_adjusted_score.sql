-- 0028's "score_override" holds the automatic 1.75x EZ product; it becomes "adjusted_score".
ALTER TABLE "game_scores" RENAME COLUMN "score_override" TO "adjusted_score";--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "score_override" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "score" SET EXPRESSION AS (COALESCE("score_override", "adjusted_score", "raw_score"));--> statement-breakpoint

-- A write without "otr.audit_user_id" is a system path and does not own "score_override".
CREATE OR REPLACE FUNCTION public.game_scores_score_override_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.resolve_audit_user_id() IS NULL THEN
    NEW.score_override := OLD.score_override;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS game_scores_score_override_guard ON game_scores;--> statement-breakpoint
CREATE TRIGGER game_scores_score_override_guard
BEFORE UPDATE ON game_scores
FOR EACH ROW
EXECUTE FUNCTION public.game_scores_score_override_guard();
