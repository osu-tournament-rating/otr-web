ALTER TABLE "game_scores" RENAME COLUMN "perfect" TO "legacy_perfect";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count300" TO "stat_great";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count100" TO "stat_ok";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count50" TO "stat_meh";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count_miss" TO "stat_miss";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count_katu" TO "stat_good";--> statement-breakpoint
ALTER TABLE "game_scores" RENAME COLUMN "count_geki" TO "stat_perfect";--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "score" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "placement" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "max_combo" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "pass" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "grade" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "mods" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "team" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "ruleset" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "verification_status" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ALTER COLUMN "rejection_reason" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "accuracy" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "pp" double precision;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_combo_break" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "is_perfect_combo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_slider_tail_hit" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_large_tick_hit" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_large_tick_miss" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_small_tick_hit" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_small_tick_miss" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_large_bonus" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_small_bonus" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_ignore_hit" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_ignore_miss" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "stat_legacy_combo_increase" integer;--> statement-breakpoint
ALTER TABLE "game_scores" ADD COLUMN "legacy_total_score" integer DEFAULT 0 NOT NULL;