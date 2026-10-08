-- public."__EFMigrationsHistory" definition

-- Drop table

-- DROP TABLE "__EFMigrationsHistory";

CREATE TABLE "__EFMigrationsHistory" ( migration_id varchar(150) NOT NULL, product_version varchar(32) NOT NULL, CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id));


-- public.logs definition

-- Drop table

-- DROP TABLE logs;

CREATE TABLE logs ( message text NULL, message_template text NULL, "level" int4 NULL, "timestamp" timestamp NULL, "exception" text NULL, log_event jsonb NULL);


-- public.players definition

-- Drop table

-- DROP TABLE players;

CREATE TABLE players ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, osu_id int8 NOT NULL, username varchar(32) DEFAULT ''::character varying NOT NULL, country varchar(4) DEFAULT ''::character varying NOT NULL, default_ruleset int4 DEFAULT 0 NOT NULL, osu_last_fetch timestamptz DEFAULT '2007-09-17 00:00:00'::timestamp without time zone NOT NULL, osu_track_last_fetch timestamptz DEFAULT '2007-09-17 00:00:00'::timestamp without time zone NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_players PRIMARY KEY (id));
CREATE INDEX ix_players_country ON public.players USING btree (country);
CREATE UNIQUE INDEX ix_players_osu_id ON public.players USING btree (osu_id);


-- public.beatmapsets definition

-- Drop table

-- DROP TABLE beatmapsets;

CREATE TABLE beatmapsets ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, osu_id int8 NOT NULL, creator_id int4 NULL, artist varchar(512) NOT NULL, title varchar(512) NOT NULL, ranked_status int4 NOT NULL, ranked_date timestamptz NULL, submitted_date timestamptz NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_beatmapsets PRIMARY KEY (id), CONSTRAINT fk_beatmapsets_players_creator_id FOREIGN KEY (creator_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_beatmapsets_creator_id ON public.beatmapsets USING btree (creator_id);
CREATE UNIQUE INDEX ix_beatmapsets_osu_id ON public.beatmapsets USING btree (osu_id);


-- public.player_highest_ranks definition

-- Drop table

-- DROP TABLE player_highest_ranks;

CREATE TABLE player_highest_ranks ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, ruleset int4 NOT NULL, global_rank int4 NOT NULL, global_rank_date timestamptz NOT NULL, country_rank int4 NOT NULL, country_rank_date timestamptz NOT NULL, player_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_player_highest_ranks PRIMARY KEY (id), CONSTRAINT fk_player_highest_ranks_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_player_highest_ranks_country_rank ON public.player_highest_ranks USING btree (country_rank DESC);
CREATE INDEX ix_player_highest_ranks_global_rank ON public.player_highest_ranks USING btree (global_rank DESC);
CREATE UNIQUE INDEX ix_player_highest_ranks_player_id_ruleset ON public.player_highest_ranks USING btree (player_id, ruleset);


-- public.player_osu_ruleset_data definition

-- Drop table

-- DROP TABLE player_osu_ruleset_data;

CREATE TABLE player_osu_ruleset_data ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, ruleset int4 NOT NULL, pp float8 NOT NULL, global_rank int4 NULL, earliest_global_rank int4 NULL, earliest_global_rank_date timestamptz NULL, player_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_player_osu_ruleset_data PRIMARY KEY (id), CONSTRAINT fk_player_osu_ruleset_data_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE UNIQUE INDEX ix_player_osu_ruleset_data_player_id_ruleset ON public.player_osu_ruleset_data USING btree (player_id, ruleset);
CREATE UNIQUE INDEX ix_player_osu_ruleset_data_player_id_ruleset_global_rank ON public.player_osu_ruleset_data USING btree (player_id, ruleset, global_rank);


-- public.player_ratings definition

-- Drop table

-- DROP TABLE player_ratings;

CREATE TABLE player_ratings ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, ruleset int4 NOT NULL, rating float8 NOT NULL, volatility float8 NOT NULL, percentile float8 NOT NULL, global_rank int4 NOT NULL, country_rank int4 NOT NULL, player_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_player_ratings PRIMARY KEY (id), CONSTRAINT fk_player_ratings_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_player_ratings_player_id ON public.player_ratings USING btree (player_id);
CREATE UNIQUE INDEX ix_player_ratings_player_id_ruleset ON public.player_ratings USING btree (player_id, ruleset);
CREATE INDEX ix_player_ratings_rating ON public.player_ratings USING btree (rating DESC);
CREATE INDEX ix_player_ratings_ruleset ON public.player_ratings USING btree (ruleset);
CREATE INDEX ix_player_ratings_ruleset_rating ON public.player_ratings USING btree (ruleset, rating DESC);


-- public.users definition

-- Drop table

-- DROP TABLE users;

CREATE TABLE users ( id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, last_login timestamptz DEFAULT CURRENT_TIMESTAMP NULL, scopes _text DEFAULT ARRAY[]::text[] NOT NULL, player_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_users PRIMARY KEY (id), CONSTRAINT fk_users_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL);
CREATE UNIQUE INDEX ix_users_player_id ON public.users USING btree (player_id);


-- public.beatmaps definition

-- Drop table

-- DROP TABLE beatmaps;

CREATE TABLE beatmaps ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, osu_id int8 NOT NULL, ruleset int4 NOT NULL, ranked_status int4 NOT NULL, diff_name varchar(512) NOT NULL, total_length int8 NOT NULL, drain_length int4 NOT NULL, bpm float8 NOT NULL, count_circle int4 NOT NULL, count_slider int4 NOT NULL, count_spinner int4 NOT NULL, cs float8 NOT NULL, hp float8 NOT NULL, od float8 NOT NULL, ar float8 NOT NULL, sr float8 NOT NULL, max_combo int4 NULL, beatmapset_id int4 NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, data_fetch_status int4 DEFAULT 0 NOT NULL, CONSTRAINT pk_beatmaps PRIMARY KEY (id), CONSTRAINT fk_beatmaps_beatmapsets_beatmapset_id FOREIGN KEY (beatmapset_id) REFERENCES beatmapsets(id) ON DELETE CASCADE);
CREATE INDEX ix_beatmaps_beatmapset_id ON public.beatmaps USING btree (beatmapset_id);
CREATE UNIQUE INDEX ix_beatmaps_osu_id ON public.beatmaps USING btree (osu_id);


-- public.filter_reports definition

-- Drop table

-- DROP TABLE filter_reports;

CREATE TABLE filter_reports ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, user_id int4 NOT NULL, ruleset int4 NOT NULL, min_rating int4 NULL, max_rating int4 NULL, tournaments_played int4 NULL, peak_rating int4 NULL, matches_played int4 NULL, players_passed int4 NOT NULL, players_failed int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, max_matches_played int4 NULL, max_tournaments_played int4 NULL, CONSTRAINT pk_filter_reports PRIMARY KEY (id), CONSTRAINT fk_filter_reports_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_filter_reports_user_id ON public.filter_reports USING btree (user_id);


-- public.join_beatmap_creators definition

-- Drop table

-- DROP TABLE join_beatmap_creators;

CREATE TABLE join_beatmap_creators ( created_beatmaps_id int4 NOT NULL, creators_id int4 NOT NULL, CONSTRAINT pk_join_beatmap_creators PRIMARY KEY (created_beatmaps_id, creators_id), CONSTRAINT fk_join_beatmap_creators_beatmaps_created_beatmaps_id FOREIGN KEY (created_beatmaps_id) REFERENCES beatmaps(id) ON DELETE CASCADE, CONSTRAINT fk_join_beatmap_creators_players_creators_id FOREIGN KEY (creators_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_join_beatmap_creators_creators_id ON public.join_beatmap_creators USING btree (creators_id);


-- public.o_auth_clients definition

-- Drop table

-- DROP TABLE o_auth_clients;

CREATE TABLE o_auth_clients ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, secret varchar(128) NOT NULL, scopes _text NOT NULL, rate_limit_override int4 NULL, user_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_o_auth_clients PRIMARY KEY (id), CONSTRAINT fk_o_auth_clients_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_o_auth_clients_user_id ON public.o_auth_clients USING btree (user_id);


-- public.player_admin_notes definition

-- Drop table

-- DROP TABLE player_admin_notes;

CREATE TABLE player_admin_notes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_player_admin_notes PRIMARY KEY (id), CONSTRAINT fk_player_admin_notes_players_reference_id FOREIGN KEY (reference_id) REFERENCES players(id) ON DELETE CASCADE, CONSTRAINT fk_player_admin_notes_users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_player_admin_notes_admin_user_id ON public.player_admin_notes USING btree (admin_user_id);
CREATE INDEX ix_player_admin_notes_reference_id ON public.player_admin_notes USING btree (reference_id);


-- public.tournaments definition

-- Drop table

-- DROP TABLE tournaments;

CREATE TABLE tournaments ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, "name" varchar(512) NOT NULL, abbreviation varchar(32) NOT NULL, forum_url varchar(255) NOT NULL, rank_range_lower_bound int4 NOT NULL, ruleset int4 NOT NULL, lobby_size int4 NOT NULL, verification_status int4 DEFAULT 0 NOT NULL, rejection_reason int4 DEFAULT 0 NOT NULL, submitted_by_user_id int4 NULL, verified_by_user_id int4 NULL, start_time timestamptz NULL, end_time timestamptz NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_tournaments PRIMARY KEY (id), CONSTRAINT fk_tournaments_users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_tournaments_users_verified_by_user_id FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE UNIQUE INDEX ix_tournaments_name_abbreviation ON public.tournaments USING btree (name, abbreviation);
CREATE INDEX ix_tournaments_ruleset ON public.tournaments USING btree (ruleset);
CREATE INDEX ix_tournaments_submitted_by_user_id ON public.tournaments USING btree (submitted_by_user_id);
CREATE INDEX ix_tournaments_verified_by_user_id ON public.tournaments USING btree (verified_by_user_id);


-- public.user_settings definition

-- Drop table

-- DROP TABLE user_settings;

CREATE TABLE user_settings ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, default_ruleset int4 DEFAULT 0 NOT NULL, default_ruleset_is_controlled bool DEFAULT false NOT NULL, user_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_user_settings PRIMARY KEY (id), CONSTRAINT fk_user_settings_users_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE UNIQUE INDEX ix_user_settings_user_id ON public.user_settings USING btree (user_id);


-- public.beatmap_attributes definition

-- Drop table

-- DROP TABLE beatmap_attributes;

CREATE TABLE beatmap_attributes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, mods int4 NOT NULL, sr float8 NOT NULL, beatmap_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_beatmap_attributes PRIMARY KEY (id), CONSTRAINT fk_beatmap_attributes_beatmaps_beatmap_id FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE);
CREATE UNIQUE INDEX ix_beatmap_attributes_beatmap_id_mods ON public.beatmap_attributes USING btree (beatmap_id, mods);


-- public.filter_report_players definition

-- Drop table

-- DROP TABLE filter_report_players;

CREATE TABLE filter_report_players ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, filter_report_id int4 NOT NULL, player_id int4 NOT NULL, is_success bool NOT NULL, failure_reason int4 NULL, current_rating float8 NULL, tournaments_played int4 NULL, matches_played int4 NULL, peak_rating float8 NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_filter_report_players PRIMARY KEY (id), CONSTRAINT fk_filter_report_players_filter_reports_filter_report_id FOREIGN KEY (filter_report_id) REFERENCES filter_reports(id) ON DELETE CASCADE, CONSTRAINT fk_filter_report_players_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_filter_report_players_filter_report_id ON public.filter_report_players USING btree (filter_report_id);
CREATE UNIQUE INDEX ix_filter_report_players_filter_report_id_player_id ON public.filter_report_players USING btree (filter_report_id, player_id);
CREATE INDEX ix_filter_report_players_player_id ON public.filter_report_players USING btree (player_id);


-- public.join_pooled_beatmaps definition

-- Drop table

-- DROP TABLE join_pooled_beatmaps;

CREATE TABLE join_pooled_beatmaps ( pooled_beatmaps_id int4 NOT NULL, tournaments_pooled_in_id int4 NOT NULL, CONSTRAINT pk_join_pooled_beatmaps PRIMARY KEY (pooled_beatmaps_id, tournaments_pooled_in_id), CONSTRAINT fk_join_pooled_beatmaps_beatmaps_pooled_beatmaps_id FOREIGN KEY (pooled_beatmaps_id) REFERENCES beatmaps(id) ON DELETE CASCADE, CONSTRAINT fk_join_pooled_beatmaps_tournaments_tournaments_pooled_in_id FOREIGN KEY (tournaments_pooled_in_id) REFERENCES tournaments(id) ON DELETE CASCADE);
CREATE INDEX ix_join_pooled_beatmaps_tournaments_pooled_in_id ON public.join_pooled_beatmaps USING btree (tournaments_pooled_in_id);


-- public.matches definition

-- Drop table

-- DROP TABLE matches;

CREATE TABLE matches ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, osu_id int8 NOT NULL, "name" varchar(512) DEFAULT ''::character varying NOT NULL, start_time timestamptz NULL, end_time timestamptz NULL, verification_status int4 DEFAULT 0 NOT NULL, rejection_reason int4 DEFAULT 0 NOT NULL, warning_flags int4 DEFAULT 0 NOT NULL, tournament_id int4 NOT NULL, submitted_by_user_id int4 NULL, verified_by_user_id int4 NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, data_fetch_status int4 DEFAULT 0 NOT NULL, CONSTRAINT pk_matches PRIMARY KEY (id), CONSTRAINT fk_matches_tournaments_tournament_id FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE, CONSTRAINT fk_matches_users_submitted_by_user_id FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL, CONSTRAINT fk_matches_users_verified_by_user_id FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE UNIQUE INDEX ix_matches_osu_id ON public.matches USING btree (osu_id);
CREATE INDEX ix_matches_submitted_by_user_id ON public.matches USING btree (submitted_by_user_id);
CREATE INDEX ix_matches_tournament_id ON public.matches USING btree (tournament_id);
CREATE INDEX ix_matches_verified_by_user_id ON public.matches USING btree (verified_by_user_id);


-- public.o_auth_client_admin_note definition

-- Drop table

-- DROP TABLE o_auth_client_admin_note;

CREATE TABLE o_auth_client_admin_note ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_o_auth_client_admin_note PRIMARY KEY (id), CONSTRAINT fk_o_auth_client_admin_note_o_auth_clients_reference_id FOREIGN KEY (reference_id) REFERENCES o_auth_clients(id) ON DELETE CASCADE);
CREATE INDEX ix_o_auth_client_admin_note_reference_id ON public.o_auth_client_admin_note USING btree (reference_id);


-- public.player_match_stats definition

-- Drop table

-- DROP TABLE player_match_stats;

CREATE TABLE player_match_stats ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, match_cost float8 NOT NULL, average_score float8 NOT NULL, average_placement float8 NOT NULL, average_misses float8 NOT NULL, average_accuracy float8 NOT NULL, games_played int4 NOT NULL, games_won int4 NOT NULL, games_lost int4 NOT NULL, won bool NOT NULL, teammate_ids _int4 NOT NULL, opponent_ids _int4 NOT NULL, player_id int4 NOT NULL, match_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_player_match_stats PRIMARY KEY (id), CONSTRAINT fk_player_match_stats_matches_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE, CONSTRAINT fk_player_match_stats_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_player_match_stats_match_id ON public.player_match_stats USING btree (match_id);
CREATE INDEX ix_player_match_stats_player_id ON public.player_match_stats USING btree (player_id);
CREATE UNIQUE INDEX ix_player_match_stats_player_id_match_id ON public.player_match_stats USING btree (player_id, match_id);
CREATE INDEX ix_player_match_stats_player_id_won ON public.player_match_stats USING btree (player_id, won);


-- public.player_tournament_stats definition

-- Drop table

-- DROP TABLE player_tournament_stats;

CREATE TABLE player_tournament_stats ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, average_rating_delta float8 NOT NULL, average_match_cost float8 NOT NULL, average_score int4 NOT NULL, average_placement float8 NOT NULL, average_accuracy float8 NOT NULL, matches_played int4 NOT NULL, matches_won int4 NOT NULL, matches_lost int4 NOT NULL, games_played int4 NOT NULL, games_won int4 NOT NULL, games_lost int4 NOT NULL, teammate_ids _int4 NOT NULL, player_id int4 NOT NULL, tournament_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, match_win_rate float8 DEFAULT 0.0 NOT NULL, CONSTRAINT pk_player_tournament_stats PRIMARY KEY (id), CONSTRAINT fk_player_tournament_stats_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE, CONSTRAINT fk_player_tournament_stats_tournaments_tournament_id FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE);
CREATE UNIQUE INDEX ix_player_tournament_stats_player_id_tournament_id ON public.player_tournament_stats USING btree (player_id, tournament_id);
CREATE INDEX ix_player_tournament_stats_tournament_id ON public.player_tournament_stats USING btree (tournament_id);


-- public.rating_adjustments definition

-- Drop table

-- DROP TABLE rating_adjustments;

CREATE TABLE rating_adjustments ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, adjustment_type int4 NOT NULL, ruleset int4 NOT NULL, "timestamp" timestamptz NOT NULL, rating_before float8 NOT NULL, rating_after float8 NOT NULL, volatility_before float8 NOT NULL, volatility_after float8 NOT NULL, player_rating_id int4 NOT NULL, player_id int4 NOT NULL, match_id int4 NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_rating_adjustments PRIMARY KEY (id), CONSTRAINT fk_rating_adjustments_matches_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE, CONSTRAINT fk_rating_adjustments_player_ratings_player_rating_id FOREIGN KEY (player_rating_id) REFERENCES player_ratings(id) ON DELETE CASCADE, CONSTRAINT fk_rating_adjustments_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_rating_adjustments_match_id ON public.rating_adjustments USING btree (match_id);
CREATE UNIQUE INDEX ix_rating_adjustments_player_id_match_id ON public.rating_adjustments USING btree (player_id, match_id);
CREATE INDEX ix_rating_adjustments_player_id_timestamp ON public.rating_adjustments USING btree (player_id, "timestamp");
CREATE INDEX ix_rating_adjustments_player_rating_id ON public.rating_adjustments USING btree (player_rating_id);


-- public.tournament_admin_notes definition

-- Drop table

-- DROP TABLE tournament_admin_notes;

CREATE TABLE tournament_admin_notes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_tournament_admin_notes PRIMARY KEY (id), CONSTRAINT fk_tournament_admin_notes_tournaments_reference_id FOREIGN KEY (reference_id) REFERENCES tournaments(id) ON DELETE CASCADE, CONSTRAINT fk_tournament_admin_notes_users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_tournament_admin_notes_admin_user_id ON public.tournament_admin_notes USING btree (admin_user_id);
CREATE INDEX ix_tournament_admin_notes_reference_id ON public.tournament_admin_notes USING btree (reference_id);


-- public.tournament_audits definition

-- Drop table

-- DROP TABLE tournament_audits;

CREATE TABLE tournament_audits ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, reference_id_lock int4 NOT NULL, reference_id int4 NULL, action_user_id int4 NULL, action_type int4 NOT NULL, changes jsonb NULL, CONSTRAINT pk_tournament_audits PRIMARY KEY (id), CONSTRAINT fk_tournament_audits_tournaments_reference_id FOREIGN KEY (reference_id) REFERENCES tournaments(id) ON DELETE SET NULL);
CREATE INDEX ix_tournament_audits_action_user_id ON public.tournament_audits USING btree (action_user_id);
CREATE INDEX ix_tournament_audits_action_user_id_created ON public.tournament_audits USING btree (action_user_id, created);
CREATE INDEX ix_tournament_audits_created ON public.tournament_audits USING btree (created);
CREATE INDEX ix_tournament_audits_reference_id ON public.tournament_audits USING btree (reference_id);
CREATE INDEX ix_tournament_audits_reference_id_lock ON public.tournament_audits USING btree (reference_id_lock);


-- public.games definition

-- Drop table

-- DROP TABLE games;

CREATE TABLE games ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, osu_id int8 NOT NULL, ruleset int4 NOT NULL, scoring_type int4 NOT NULL, team_type int4 NOT NULL, mods int4 NOT NULL, start_time timestamptz DEFAULT '2007-09-17 00:00:00'::timestamp without time zone NOT NULL, end_time timestamptz DEFAULT '2007-09-17 00:00:00'::timestamp without time zone NOT NULL, verification_status int4 DEFAULT 0 NOT NULL, rejection_reason int4 DEFAULT 0 NOT NULL, warning_flags int4 DEFAULT 0 NOT NULL, match_id int4 NOT NULL, beatmap_id int4 NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, play_mode int4 DEFAULT 0 NOT NULL, CONSTRAINT pk_games PRIMARY KEY (id), CONSTRAINT fk_games_beatmaps_beatmap_id FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE, CONSTRAINT fk_games_matches_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE);
CREATE INDEX ix_games_beatmap_id ON public.games USING btree (beatmap_id);
CREATE INDEX ix_games_match_id ON public.games USING btree (match_id);
CREATE UNIQUE INDEX ix_games_osu_id ON public.games USING btree (osu_id);
CREATE INDEX ix_games_start_time ON public.games USING btree (start_time);


-- public.match_admin_notes definition

-- Drop table

-- DROP TABLE match_admin_notes;

CREATE TABLE match_admin_notes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_match_admin_notes PRIMARY KEY (id), CONSTRAINT fk_match_admin_notes_matches_reference_id FOREIGN KEY (reference_id) REFERENCES matches(id) ON DELETE CASCADE, CONSTRAINT fk_match_admin_notes_users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_match_admin_notes_admin_user_id ON public.match_admin_notes USING btree (admin_user_id);
CREATE INDEX ix_match_admin_notes_reference_id ON public.match_admin_notes USING btree (reference_id);


-- public.match_audits definition

-- Drop table

-- DROP TABLE match_audits;

CREATE TABLE match_audits ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, reference_id_lock int4 NOT NULL, reference_id int4 NULL, action_user_id int4 NULL, action_type int4 NOT NULL, changes jsonb NULL, CONSTRAINT pk_match_audits PRIMARY KEY (id), CONSTRAINT fk_match_audits_matches_reference_id FOREIGN KEY (reference_id) REFERENCES matches(id) ON DELETE SET NULL);
CREATE INDEX ix_match_audits_action_user_id ON public.match_audits USING btree (action_user_id);
CREATE INDEX ix_match_audits_action_user_id_created ON public.match_audits USING btree (action_user_id, created);
CREATE INDEX ix_match_audits_created ON public.match_audits USING btree (created);
CREATE INDEX ix_match_audits_reference_id ON public.match_audits USING btree (reference_id);
CREATE INDEX ix_match_audits_reference_id_lock ON public.match_audits USING btree (reference_id_lock);


-- public.match_rosters definition

-- Drop table

-- DROP TABLE match_rosters;

CREATE TABLE match_rosters ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, roster _int4 NOT NULL, team int4 NOT NULL, score int4 NOT NULL, match_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_match_rosters PRIMARY KEY (id), CONSTRAINT fk_match_rosters_matches_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE);
CREATE INDEX ix_match_rosters_match_id ON public.match_rosters USING btree (match_id);
CREATE UNIQUE INDEX ix_match_rosters_match_id_roster ON public.match_rosters USING btree (match_id, roster);
CREATE INDEX ix_match_rosters_roster ON public.match_rosters USING btree (roster);


-- public.game_admin_notes definition

-- Drop table

-- DROP TABLE game_admin_notes;

CREATE TABLE game_admin_notes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_game_admin_notes PRIMARY KEY (id), CONSTRAINT fk_game_admin_notes_games_reference_id FOREIGN KEY (reference_id) REFERENCES games(id) ON DELETE CASCADE, CONSTRAINT fk_game_admin_notes_users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_game_admin_notes_admin_user_id ON public.game_admin_notes USING btree (admin_user_id);
CREATE INDEX ix_game_admin_notes_reference_id ON public.game_admin_notes USING btree (reference_id);


-- public.game_audits definition

-- Drop table

-- DROP TABLE game_audits;

CREATE TABLE game_audits ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, reference_id_lock int4 NOT NULL, reference_id int4 NULL, action_user_id int4 NULL, action_type int4 NOT NULL, changes jsonb NULL, CONSTRAINT pk_game_audits PRIMARY KEY (id), CONSTRAINT fk_game_audits_games_reference_id FOREIGN KEY (reference_id) REFERENCES games(id) ON DELETE SET NULL);
CREATE INDEX ix_game_audits_action_user_id ON public.game_audits USING btree (action_user_id);
CREATE INDEX ix_game_audits_action_user_id_created ON public.game_audits USING btree (action_user_id, created);
CREATE INDEX ix_game_audits_created ON public.game_audits USING btree (created);
CREATE INDEX ix_game_audits_reference_id ON public.game_audits USING btree (reference_id);
CREATE INDEX ix_game_audits_reference_id_lock ON public.game_audits USING btree (reference_id_lock);


-- public.game_rosters definition

-- Drop table

-- DROP TABLE game_rosters;

CREATE TABLE game_rosters ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, roster _int4 NOT NULL, team int4 NOT NULL, score int4 NOT NULL, game_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT pk_game_rosters PRIMARY KEY (id), CONSTRAINT fk_game_rosters_games_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE);
CREATE INDEX ix_game_rosters_game_id ON public.game_rosters USING btree (game_id);
CREATE UNIQUE INDEX ix_game_rosters_game_id_roster ON public.game_rosters USING btree (game_id, roster);
CREATE INDEX ix_game_rosters_roster ON public.game_rosters USING btree (roster);


-- public.game_scores definition

-- Drop table

-- DROP TABLE game_scores;

CREATE TABLE game_scores ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, score int4 NOT NULL, placement int4 NOT NULL, max_combo int4 NOT NULL, count50 int4 NOT NULL, count100 int4 NOT NULL, count300 int4 NOT NULL, count_miss int4 NOT NULL, count_katu int4 NOT NULL, count_geki int4 NOT NULL, pass bool NOT NULL, perfect bool NOT NULL, grade int4 NOT NULL, mods int4 NOT NULL, team int4 NOT NULL, ruleset int4 NOT NULL, verification_status int4 NOT NULL, rejection_reason int4 NOT NULL, game_id int4 NOT NULL, player_id int4 NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, CONSTRAINT pk_game_scores PRIMARY KEY (id), CONSTRAINT fk_game_scores_games_game_id FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE, CONSTRAINT fk_game_scores_players_player_id FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX ix_game_scores_game_id ON public.game_scores USING btree (game_id);
CREATE INDEX ix_game_scores_player_id ON public.game_scores USING btree (player_id);
CREATE UNIQUE INDEX ix_game_scores_player_id_game_id ON public.game_scores USING btree (player_id, game_id);


-- public.game_score_admin_notes definition

-- Drop table

-- DROP TABLE game_score_admin_notes;

CREATE TABLE game_score_admin_notes ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated timestamptz NULL, note text NOT NULL, reference_id int4 NOT NULL, admin_user_id int4 NOT NULL, CONSTRAINT pk_game_score_admin_notes PRIMARY KEY (id), CONSTRAINT fk_game_score_admin_notes_game_scores_reference_id FOREIGN KEY (reference_id) REFERENCES game_scores(id) ON DELETE CASCADE, CONSTRAINT fk_game_score_admin_notes_users_admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX ix_game_score_admin_notes_admin_user_id ON public.game_score_admin_notes USING btree (admin_user_id);
CREATE INDEX ix_game_score_admin_notes_reference_id ON public.game_score_admin_notes USING btree (reference_id);


-- public.game_score_audits definition

-- Drop table

-- DROP TABLE game_score_audits;

CREATE TABLE game_score_audits ( id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL, created timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, reference_id_lock int4 NOT NULL, reference_id int4 NULL, action_user_id int4 NULL, action_type int4 NOT NULL, changes jsonb NULL, CONSTRAINT pk_game_score_audits PRIMARY KEY (id), CONSTRAINT fk_game_score_audits_game_scores_reference_id FOREIGN KEY (reference_id) REFERENCES game_scores(id) ON DELETE SET NULL);
CREATE INDEX ix_game_score_audits_action_user_id ON public.game_score_audits USING btree (action_user_id);
CREATE INDEX ix_game_score_audits_action_user_id_created ON public.game_score_audits USING btree (action_user_id, created);
CREATE INDEX ix_game_score_audits_created ON public.game_score_audits USING btree (created);
CREATE INDEX ix_game_score_audits_reference_id ON public.game_score_audits USING btree (reference_id);
CREATE INDEX ix_game_score_audits_reference_id_lock ON public.game_score_audits USING btree (reference_id_lock);
