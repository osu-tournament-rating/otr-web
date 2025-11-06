-- Migration to recalculate accuracy for all scores using the old formula
-- Accuracy is calculated as a float from 0 to 1.0 based on ruleset

UPDATE game_scores
SET accuracy = CASE
  -- Osu (ruleset = 0)
  WHEN ruleset = 0 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) * 300.0 + COALESCE(stat_ok, 0) * 100.0 + COALESCE(stat_meh, 0) * 50.0) /
        ((COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0)) * 300.0)
      ))
    END

  -- Taiko (ruleset = 1)
  WHEN ruleset = 1 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) * 0.5) /
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_miss, 0))
      ))
    END

  -- Catch (ruleset = 2)
  WHEN ruleset = 2 THEN
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_good, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0)) /
        (COALESCE(stat_great, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_good, 0) + COALESCE(stat_miss, 0))
      ))
    END

  -- Mania (ruleset = 3, 4, 5, or default)
  ELSE
    CASE
      WHEN COALESCE(stat_great, 0) + COALESCE(stat_perfect, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_good, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0) = 0 THEN 0
      ELSE GREATEST(0, LEAST(1,
        (COALESCE(stat_perfect, 0) * 305.0 + COALESCE(stat_great, 0) * 300.0 + COALESCE(stat_good, 0) * 200.0 + COALESCE(stat_ok, 0) * 100.0 + COALESCE(stat_meh, 0) * 50.0) /
        ((COALESCE(stat_perfect, 0) + COALESCE(stat_great, 0) + COALESCE(stat_good, 0) + COALESCE(stat_ok, 0) + COALESCE(stat_meh, 0) + COALESCE(stat_miss, 0)) * 305.0)
      ))
    END
END;
