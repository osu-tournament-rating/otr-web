ALTER TABLE "game_scores" ALTER COLUMN "score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "placement" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "accuracy" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "max_combo" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "pass" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "is_perfect_combo" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "legacy_perfect" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "grade" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "mods" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "legacy_total_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "team" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "ruleset" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "verification_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "rejection_reason" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "stat_ok" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "stat_meh" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "stat_good" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "stat_perfect" DROP NOT NULL;--> statement-breakpoint

-- Recalculate accuracy for all scores using the old formula
-- Accuracy is calculated as a float from 0 to 1.0 based on ruleset
UPDATE game_scores
SET accuracy = CASE
  -- Osu
  WHEN ruleset = 0 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) * 300.0 + COALESCE(stat_ok, 0) * 100.0 + COALESCE(stat_meh, 0) * 50.0) /
        ((COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0)) * 300.0)
      ))
    END

  -- Taiko
  WHEN ruleset = 1 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) * 0.5) /
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_miss, 0))
      ))
    END

  -- Catch
  WHEN ruleset = 2 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_good, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0)) /
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_good, 0) + COALESCE(stat_miss, 0))
      ))
    END

  -- Mania (all)
  ELSE
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_perfect, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_good, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_perfect, 0) * 305.0 + COALESCE(stat_great, 0) * 300.0 + COALESCE(stat_good, 0) * 200.0 + COALESCE(stat_ok, 0) * 100.0 + COALESCE(stat_meh, 0) * 50.0) /
        ((COALESCE(stat_perfect, 0) + COALESCE(stat_great, 0) + COALESCE(stat_good, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0)) * 305.0)
      ))
    END
END;--> statement-breakpoint

-- Catch score data migration
UPDATE game_scores SET
    stat_large_tick_hit = stat_ok,
    stat_small_tick_hit = stat_meh,
    stat_small_tick_miss = stat_good,
    stat_ok = NULL,
    stat_meh = NULL,
    stat_good = NULL,
    stat_perfect = NULL
WHERE ruleset = 2;