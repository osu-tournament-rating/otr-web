ALTER TABLE "game_scores" RENAME COLUMN "score" TO "raw_score";--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "score_override" integer;--> statement-breakpoint
ALTER TABLE "game_scores" DISABLE TRIGGER "trg_game_scores_audit";--> statement-breakpoint
-- o!TR multiplies EZ scores by 1.75x. That product moves from "raw_score" to
-- "score_override" and "raw_score" returns to the osu! total. Rows are converted
-- where "legacy_total_score" proves the multiplier was applied, plus every
-- stable EZ row, which is multiplied without exception.
-- A 1.75x product is never 6 mod 7 under either rounding era.
UPDATE "game_scores" gs
SET "score_override" = gs."raw_score",
    "raw_score" = (
      CASE
        WHEN gs."legacy_total_score" > 0
          AND gs."raw_score" = round(gs."legacy_total_score" * 1.75)
          THEN gs."legacy_total_score"
        WHEN round(floor(gs."raw_score" / 1.75) * 1.75) = gs."raw_score"
          OR floor(floor(gs."raw_score" / 1.75) * 1.75) = gs."raw_score"
          THEN floor(gs."raw_score" / 1.75)
        ELSE floor(gs."raw_score" / 1.75) + 1
      END
    )::integer
FROM "games" g, "matches" m
WHERE gs."game_id" = g."id"
  AND g."match_id" = m."id"
  AND (gs."mods" & 2) = 2
  AND gs."score_override" IS NULL
  AND gs."raw_score" > 0
  AND (gs."raw_score" % 7) <> 6
  AND (
    m."is_lazer" = false
    OR (
      gs."legacy_total_score" > 0
      AND gs."raw_score" = round(gs."legacy_total_score" * 1.75)
    )
  );--> statement-breakpoint
ALTER TABLE "game_scores" ENABLE TRIGGER "trg_game_scores_audit";--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "score" integer GENERATED ALWAYS AS (COALESCE("score_override", "raw_score")) STORED NOT NULL;
