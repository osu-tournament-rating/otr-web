-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "__EFMigrationsHistory" (
	"migration_id" varchar(150) PRIMARY KEY NOT NULL,
	"product_version" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beatmapsets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmapsets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osu_id" bigint NOT NULL,
	"creator_id" integer,
	"artist" varchar(512) NOT NULL,
	"title" varchar(512) NOT NULL,
	"ranked_status" integer NOT NULL,
	"ranked_date" timestamp with time zone,
	"submitted_date" timestamp with time zone,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "filter_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "filter_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"ruleset" integer NOT NULL,
	"min_rating" integer,
	"max_rating" integer,
	"tournaments_played" integer,
	"peak_rating" integer,
	"matches_played" integer,
	"players_passed" integer NOT NULL,
	"players_failed" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"max_matches_played" integer,
	"max_tournaments_played" integer
);
--> statement-breakpoint
CREATE TABLE "game_audits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference_id_lock" integer NOT NULL,
	"reference_id" integer,
	"action_user_id" integer,
	"action_type" integer NOT NULL,
	"changes" jsonb
);
--> statement-breakpoint
CREATE TABLE "game_rosters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_rosters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roster" integer[] NOT NULL,
	"team" integer NOT NULL,
	"score" integer NOT NULL,
	"game_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_scores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"score" integer NOT NULL,
	"placement" integer NOT NULL,
	"max_combo" integer NOT NULL,
	"count50" integer NOT NULL,
	"count100" integer NOT NULL,
	"count300" integer NOT NULL,
	"count_miss" integer NOT NULL,
	"count_katu" integer NOT NULL,
	"count_geki" integer NOT NULL,
	"pass" boolean NOT NULL,
	"perfect" boolean NOT NULL,
	"grade" integer NOT NULL,
	"mods" integer NOT NULL,
	"team" integer NOT NULL,
	"ruleset" integer NOT NULL,
	"verification_status" integer NOT NULL,
	"rejection_reason" integer NOT NULL,
	"game_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_score_audits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_score_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference_id_lock" integer NOT NULL,
	"reference_id" integer,
	"action_user_id" integer,
	"action_type" integer NOT NULL,
	"changes" jsonb
);
--> statement-breakpoint
CREATE TABLE "beatmaps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmaps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osu_id" bigint NOT NULL,
	"ruleset" integer NOT NULL,
	"ranked_status" integer NOT NULL,
	"diff_name" varchar(512) NOT NULL,
	"total_length" bigint NOT NULL,
	"drain_length" integer NOT NULL,
	"bpm" double precision NOT NULL,
	"count_circle" integer NOT NULL,
	"count_slider" integer NOT NULL,
	"count_spinner" integer NOT NULL,
	"cs" double precision NOT NULL,
	"hp" double precision NOT NULL,
	"od" double precision NOT NULL,
	"ar" double precision NOT NULL,
	"sr" double precision NOT NULL,
	"max_combo" integer,
	"beatmapset_id" integer,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"data_fetch_status" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_report_players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "filter_report_players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"filter_report_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"is_success" boolean NOT NULL,
	"failure_reason" integer,
	"current_rating" double precision,
	"tournaments_played" integer,
	"matches_played" integer,
	"peak_rating" double precision,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "games_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osu_id" bigint NOT NULL,
	"ruleset" integer NOT NULL,
	"scoring_type" integer NOT NULL,
	"team_type" integer NOT NULL,
	"mods" integer NOT NULL,
	"start_time" timestamp with time zone DEFAULT '2007-09-17 00:00:00' NOT NULL,
	"end_time" timestamp with time zone DEFAULT '2007-09-17 00:00:00' NOT NULL,
	"verification_status" integer DEFAULT 0 NOT NULL,
	"rejection_reason" integer DEFAULT 0 NOT NULL,
	"warning_flags" integer DEFAULT 0 NOT NULL,
	"match_id" integer NOT NULL,
	"beatmap_id" integer,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"play_mode" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_score_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_score_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"message" text,
	"message_template" text,
	"level" integer,
	"timestamp" timestamp,
	"exception" text,
	"log_event" jsonb
);
--> statement-breakpoint
CREATE TABLE "match_audits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference_id_lock" integer NOT NULL,
	"reference_id" integer,
	"action_user_id" integer,
	"action_type" integer NOT NULL,
	"changes" jsonb
);
--> statement-breakpoint
CREATE TABLE "match_rosters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_rosters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roster" integer[] NOT NULL,
	"team" integer NOT NULL,
	"score" integer NOT NULL,
	"match_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "matches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osu_id" bigint NOT NULL,
	"name" varchar(512) DEFAULT '' NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"verification_status" integer DEFAULT 0 NOT NULL,
	"rejection_reason" integer DEFAULT 0 NOT NULL,
	"warning_flags" integer DEFAULT 0 NOT NULL,
	"tournament_id" integer NOT NULL,
	"submitted_by_user_id" integer,
	"verified_by_user_id" integer,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"data_fetch_status" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_highest_ranks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_highest_ranks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ruleset" integer NOT NULL,
	"global_rank" integer NOT NULL,
	"global_rank_date" timestamp with time zone NOT NULL,
	"country_rank" integer NOT NULL,
	"country_rank_date" timestamp with time zone NOT NULL,
	"player_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "player_osu_ruleset_data" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_osu_ruleset_data_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ruleset" integer NOT NULL,
	"pp" double precision NOT NULL,
	"global_rank" integer,
	"earliest_global_rank" integer,
	"earliest_global_rank_date" timestamp with time zone,
	"player_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rating_adjustments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rating_adjustments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"adjustment_type" integer NOT NULL,
	"ruleset" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"rating_before" double precision NOT NULL,
	"rating_after" double precision NOT NULL,
	"volatility_before" double precision NOT NULL,
	"volatility_after" double precision NOT NULL,
	"player_rating_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osu_id" bigint NOT NULL,
	"username" varchar(32) DEFAULT '' NOT NULL,
	"country" varchar(4) DEFAULT '' NOT NULL,
	"default_ruleset" integer DEFAULT 0 NOT NULL,
	"osu_last_fetch" timestamp with time zone DEFAULT '2007-09-17 00:00:00' NOT NULL,
	"osu_track_last_fetch" timestamp with time zone DEFAULT '2007-09-17 00:00:00' NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "o_auth_clients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "o_auth_clients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"secret" varchar(128) NOT NULL,
	"scopes" text[] NOT NULL,
	"rate_limit_override" integer,
	"user_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "player_match_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_match_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"match_cost" double precision NOT NULL,
	"average_score" double precision NOT NULL,
	"average_placement" double precision NOT NULL,
	"average_misses" double precision NOT NULL,
	"average_accuracy" double precision NOT NULL,
	"games_played" integer NOT NULL,
	"games_won" integer NOT NULL,
	"games_lost" integer NOT NULL,
	"won" boolean NOT NULL,
	"teammate_ids" integer[] NOT NULL,
	"opponent_ids" integer[] NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_ratings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_ratings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ruleset" integer NOT NULL,
	"rating" double precision NOT NULL,
	"volatility" double precision NOT NULL,
	"percentile" double precision NOT NULL,
	"global_rank" integer NOT NULL,
	"country_rank" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_tournament_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_tournament_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"average_rating_delta" double precision NOT NULL,
	"average_match_cost" double precision NOT NULL,
	"average_score" integer NOT NULL,
	"average_placement" double precision NOT NULL,
	"average_accuracy" double precision NOT NULL,
	"matches_played" integer NOT NULL,
	"matches_won" integer NOT NULL,
	"matches_lost" integer NOT NULL,
	"games_played" integer NOT NULL,
	"games_won" integer NOT NULL,
	"games_lost" integer NOT NULL,
	"teammate_ids" integer[] NOT NULL,
	"player_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"match_win_rate" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tournament_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_audits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tournament_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference_id_lock" integer NOT NULL,
	"reference_id" integer,
	"action_user_id" integer,
	"action_type" integer NOT NULL,
	"changes" jsonb
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tournaments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(512) NOT NULL,
	"abbreviation" varchar(32) NOT NULL,
	"forum_url" varchar(255) NOT NULL,
	"rank_range_lower_bound" integer NOT NULL,
	"ruleset" integer NOT NULL,
	"lobby_size" integer NOT NULL,
	"verification_status" integer DEFAULT 0 NOT NULL,
	"rejection_reason" integer DEFAULT 0 NOT NULL,
	"submitted_by_user_id" integer,
	"verified_by_user_id" integer,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"default_ruleset" integer DEFAULT 0 NOT NULL,
	"default_ruleset_is_controlled" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "beatmap_attributes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmap_attributes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"mods" integer NOT NULL,
	"sr" double precision NOT NULL,
	"beatmap_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"last_login" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"scopes" text[] DEFAULT '{"RAY"}' NOT NULL,
	"player_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "o_auth_client_admin_note" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "o_auth_client_admin_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_restrictions" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "user_restrictions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"feature_scope" varchar(100) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_user_id" integer NOT NULL,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "join_beatmap_creators" (
	"created_beatmaps_id" integer NOT NULL,
	"creators_id" integer NOT NULL,
	CONSTRAINT "pk_join_beatmap_creators" PRIMARY KEY("created_beatmaps_id","creators_id")
);
--> statement-breakpoint
CREATE TABLE "join_pooled_beatmaps" (
	"pooled_beatmaps_id" integer NOT NULL,
	"tournaments_pooled_in_id" integer NOT NULL,
	CONSTRAINT "pk_join_pooled_beatmaps" PRIMARY KEY("pooled_beatmaps_id","tournaments_pooled_in_id")
);
--> statement-breakpoint
ALTER TABLE "beatmapsets" ADD CONSTRAINT "fk_beatmapsets_players_creator_id" FOREIGN KEY ("creator_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_reports" ADD CONSTRAINT "fk_filter_reports_users_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_audits" ADD CONSTRAINT "fk_game_audits_games_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rosters" ADD CONSTRAINT "fk_game_rosters_games_game_id" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "fk_game_scores_games_game_id" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "fk_game_scores_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score_audits" ADD CONSTRAINT "fk_game_score_audits_game_scores_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."game_scores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD CONSTRAINT "fk_beatmaps_beatmapsets_beatmapset_id" FOREIGN KEY ("beatmapset_id") REFERENCES "public"."beatmapsets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_report_players" ADD CONSTRAINT "fk_filter_report_players_filter_reports_filter_report_id" FOREIGN KEY ("filter_report_id") REFERENCES "public"."filter_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_report_players" ADD CONSTRAINT "fk_filter_report_players_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "fk_games_beatmaps_beatmap_id" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "fk_games_matches_match_id" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_admin_notes" ADD CONSTRAINT "fk_game_admin_notes_games_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_admin_notes" ADD CONSTRAINT "fk_game_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score_admin_notes" ADD CONSTRAINT "fk_game_score_admin_notes_game_scores_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."game_scores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score_admin_notes" ADD CONSTRAINT "fk_game_score_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_audits" ADD CONSTRAINT "fk_match_audits_matches_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rosters" ADD CONSTRAINT "fk_match_rosters_matches_match_id" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_admin_notes" ADD CONSTRAINT "fk_match_admin_notes_matches_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_admin_notes" ADD CONSTRAINT "fk_match_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "fk_matches_tournaments_tournament_id" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "fk_matches_users_submitted_by_user_id" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "fk_matches_users_verified_by_user_id" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_admin_notes" ADD CONSTRAINT "fk_player_admin_notes_players_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_admin_notes" ADD CONSTRAINT "fk_player_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_highest_ranks" ADD CONSTRAINT "fk_player_highest_ranks_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_osu_ruleset_data" ADD CONSTRAINT "fk_player_osu_ruleset_data_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_adjustments" ADD CONSTRAINT "fk_rating_adjustments_matches_match_id" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_adjustments" ADD CONSTRAINT "fk_rating_adjustments_player_ratings_player_rating_id" FOREIGN KEY ("player_rating_id") REFERENCES "public"."player_ratings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_adjustments" ADD CONSTRAINT "fk_rating_adjustments_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "o_auth_clients" ADD CONSTRAINT "fk_o_auth_clients_users_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "fk_player_match_stats_matches_match_id" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_stats" ADD CONSTRAINT "fk_player_match_stats_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "fk_player_ratings_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_stats" ADD CONSTRAINT "fk_player_tournament_stats_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tournament_stats" ADD CONSTRAINT "fk_player_tournament_stats_tournaments_tournament_id" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_admin_notes" ADD CONSTRAINT "fk_tournament_admin_notes_tournaments_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_admin_notes" ADD CONSTRAINT "fk_tournament_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_audits" ADD CONSTRAINT "fk_tournament_audits_tournaments_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "fk_tournaments_users_submitted_by_user_id" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "fk_tournaments_users_verified_by_user_id" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "fk_user_settings_users_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "fk_beatmap_attributes_beatmaps_beatmap_id" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "fk_users_players_player_id" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "o_auth_client_admin_note" ADD CONSTRAINT "fk_o_auth_client_admin_note_o_auth_clients_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."o_auth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_restrictions" ADD CONSTRAINT "fk_user_restrictions_users_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_restrictions" ADD CONSTRAINT "fk_user_restrictions_users_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_beatmap_creators" ADD CONSTRAINT "fk_join_beatmap_creators_beatmaps_created_beatmaps_id" FOREIGN KEY ("created_beatmaps_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_beatmap_creators" ADD CONSTRAINT "fk_join_beatmap_creators_players_creators_id" FOREIGN KEY ("creators_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_pooled_beatmaps" ADD CONSTRAINT "fk_join_pooled_beatmaps_beatmaps_pooled_beatmaps_id" FOREIGN KEY ("pooled_beatmaps_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_pooled_beatmaps" ADD CONSTRAINT "fk_join_pooled_beatmaps_tournaments_tournaments_pooled_in_id" FOREIGN KEY ("tournaments_pooled_in_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_beatmapsets_creator_id" ON "beatmapsets" USING btree ("creator_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_beatmapsets_osu_id" ON "beatmapsets" USING btree ("osu_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_filter_reports_user_id" ON "filter_reports" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_audits_action_user_id" ON "game_audits" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_audits_action_user_id_created" ON "game_audits" USING btree ("action_user_id" int4_ops,"created" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_audits_created" ON "game_audits" USING btree ("created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_game_audits_reference_id" ON "game_audits" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_audits_reference_id_lock" ON "game_audits" USING btree ("reference_id_lock" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_rosters_game_id" ON "game_rosters" USING btree ("game_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_game_rosters_game_id_roster" ON "game_rosters" USING btree ("game_id" int4_ops,"roster" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_rosters_roster" ON "game_rosters" USING btree ("roster" array_ops);--> statement-breakpoint
CREATE INDEX "ix_game_scores_game_id" ON "game_scores" USING btree ("game_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_scores_player_id" ON "game_scores" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_game_scores_player_id_game_id" ON "game_scores" USING btree ("player_id" int4_ops,"game_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_action_user_id" ON "game_score_audits" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_action_user_id_created" ON "game_score_audits" USING btree ("action_user_id" int4_ops,"created" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_created" ON "game_score_audits" USING btree ("created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_reference_id" ON "game_score_audits" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_audits_reference_id_lock" ON "game_score_audits" USING btree ("reference_id_lock" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmaps_beatmapset_id" ON "beatmaps" USING btree ("beatmapset_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_beatmaps_osu_id" ON "beatmaps" USING btree ("osu_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_filter_report_players_filter_report_id" ON "filter_report_players" USING btree ("filter_report_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_filter_report_players_filter_report_id_player_id" ON "filter_report_players" USING btree ("filter_report_id" int4_ops,"player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_filter_report_players_player_id" ON "filter_report_players" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_games_beatmap_id" ON "games" USING btree ("beatmap_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_games_match_id" ON "games" USING btree ("match_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_games_osu_id" ON "games" USING btree ("osu_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_games_start_time" ON "games" USING btree ("start_time" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_game_admin_notes_admin_user_id" ON "game_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_admin_notes_reference_id" ON "game_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_admin_notes_admin_user_id" ON "game_score_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_game_score_admin_notes_reference_id" ON "game_score_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_action_user_id" ON "match_audits" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_action_user_id_created" ON "match_audits" USING btree ("action_user_id" int4_ops,"created" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_created" ON "match_audits" USING btree ("created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_reference_id" ON "match_audits" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_audits_reference_id_lock" ON "match_audits" USING btree ("reference_id_lock" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_rosters_match_id" ON "match_rosters" USING btree ("match_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_match_rosters_match_id_roster" ON "match_rosters" USING btree ("match_id" int4_ops,"roster" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_rosters_roster" ON "match_rosters" USING btree ("roster" array_ops);--> statement-breakpoint
CREATE INDEX "ix_match_admin_notes_admin_user_id" ON "match_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_match_admin_notes_reference_id" ON "match_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_matches_osu_id" ON "matches" USING btree ("osu_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_matches_submitted_by_user_id" ON "matches" USING btree ("submitted_by_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_matches_tournament_id" ON "matches" USING btree ("tournament_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_matches_verified_by_user_id" ON "matches" USING btree ("verified_by_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_admin_notes_admin_user_id" ON "player_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_admin_notes_reference_id" ON "player_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_highest_ranks_country_rank" ON "player_highest_ranks" USING btree ("country_rank" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_highest_ranks_global_rank" ON "player_highest_ranks" USING btree ("global_rank" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_highest_ranks_player_id_ruleset" ON "player_highest_ranks" USING btree ("player_id" int4_ops,"ruleset" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_osu_ruleset_data_player_id_ruleset" ON "player_osu_ruleset_data" USING btree ("player_id" int4_ops,"ruleset" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_osu_ruleset_data_player_id_ruleset_global_rank" ON "player_osu_ruleset_data" USING btree ("player_id" int4_ops,"ruleset" int4_ops,"global_rank" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_rating_adjustments_match_id" ON "rating_adjustments" USING btree ("match_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_rating_adjustments_player_id_match_id" ON "rating_adjustments" USING btree ("player_id" int4_ops,"match_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_rating_adjustments_player_id_timestamp" ON "rating_adjustments" USING btree ("player_id" int4_ops,"timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_rating_adjustments_player_rating_id" ON "rating_adjustments" USING btree ("player_rating_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_players_country" ON "players" USING btree ("country" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_players_osu_id" ON "players" USING btree ("osu_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_o_auth_clients_user_id" ON "o_auth_clients" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_match_stats_match_id" ON "player_match_stats" USING btree ("match_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_match_stats_player_id" ON "player_match_stats" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_match_stats_player_id_match_id" ON "player_match_stats" USING btree ("player_id" int4_ops,"match_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_match_stats_player_id_won" ON "player_match_stats" USING btree ("player_id" bool_ops,"won" bool_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_player_id" ON "player_ratings" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_ratings_player_id_ruleset" ON "player_ratings" USING btree ("player_id" int4_ops,"ruleset" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_rating" ON "player_ratings" USING btree ("rating" float8_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_ruleset" ON "player_ratings" USING btree ("ruleset" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_ruleset_rating" ON "player_ratings" USING btree ("ruleset" float8_ops,"rating" float8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_player_tournament_stats_player_id_tournament_id" ON "player_tournament_stats" USING btree ("player_id" int4_ops,"tournament_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_tournament_stats_tournament_id" ON "player_tournament_stats" USING btree ("tournament_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_admin_notes_admin_user_id" ON "tournament_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_admin_notes_reference_id" ON "tournament_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_action_user_id" ON "tournament_audits" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_action_user_id_created" ON "tournament_audits" USING btree ("action_user_id" int4_ops,"created" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_created" ON "tournament_audits" USING btree ("created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_reference_id" ON "tournament_audits" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournament_audits_reference_id_lock" ON "tournament_audits" USING btree ("reference_id_lock" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_tournaments_name_abbreviation" ON "tournaments" USING btree ("name" text_ops,"abbreviation" text_ops);--> statement-breakpoint
CREATE INDEX "ix_tournaments_ruleset" ON "tournaments" USING btree ("ruleset" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournaments_submitted_by_user_id" ON "tournaments" USING btree ("submitted_by_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_tournaments_verified_by_user_id" ON "tournaments" USING btree ("verified_by_user_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_user_settings_user_id" ON "user_settings" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_beatmap_attributes_beatmap_id_mods" ON "beatmap_attributes" USING btree ("beatmap_id" int4_ops,"mods" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ix_users_player_id" ON "users" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_o_auth_client_admin_note_reference_id" ON "o_auth_client_admin_note" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "IX_UserRestrictions_ExpiresAt" ON "user_restrictions" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "IX_UserRestrictions_IsActive" ON "user_restrictions" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "IX_UserRestrictions_UserId_FeatureScope_IsActive" ON "user_restrictions" USING btree ("user_id" text_ops,"feature_scope" int4_ops,"is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "ix_user_restrictions_created_by_user_id" ON "user_restrictions" USING btree ("created_by_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_join_beatmap_creators_creators_id" ON "join_beatmap_creators" USING btree ("creators_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_join_pooled_beatmaps_tournaments_pooled_in_id" ON "join_pooled_beatmaps" USING btree ("tournaments_pooled_in_id" int4_ops);
*/