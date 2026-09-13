CREATE TABLE "platform_player_stats" (
	"ruleset" integer PRIMARY KEY NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"source_key" text NOT NULL,
	"payload" jsonb NOT NULL
);
