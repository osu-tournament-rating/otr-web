CREATE TABLE public.players (
    id integer PRIMARY KEY,
    osu_id bigint NOT NULL,
    username text NOT NULL,
    country text NOT NULL DEFAULT ''
);

CREATE TABLE public.player_ratings (
    id integer PRIMARY KEY,
    player_id integer NOT NULL,
    ruleset integer NOT NULL,
    rating double precision NOT NULL,
    volatility double precision NOT NULL,
    percentile double precision NOT NULL,
    global_rank integer NOT NULL,
    country_rank integer NOT NULL
);

CREATE TABLE public.rating_adjustments (
    id integer PRIMARY KEY,
    player_id integer NOT NULL,
    ruleset integer NOT NULL,
    player_rating_id integer NOT NULL,
    match_id integer,
    adjustment_type integer NOT NULL,
    "timestamp" timestamptz NOT NULL,
    rating_before double precision NOT NULL,
    rating_after double precision NOT NULL,
    volatility_before double precision NOT NULL,
    volatility_after double precision NOT NULL
);
