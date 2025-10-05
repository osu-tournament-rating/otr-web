CREATE TABLE "player_friends" (
	"player_id" integer NOT NULL,
	"friend_id" integer NOT NULL,
	"mutual" boolean DEFAULT false NOT NULL,
	CONSTRAINT "player_friends_player_id_friend_id_pk" PRIMARY KEY("player_id","friend_id")
);
--> statement-breakpoint
DROP INDEX "ix_player_ratings_ruleset_rating";--> statement-breakpoint
ALTER TABLE "player_friends" ADD CONSTRAINT "player_friends_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_friends" ADD CONSTRAINT "player_friends_friend_id_players_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_player_friends_friend_id" ON "player_friends" USING btree ("friend_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_player_ratings_ruleset_rating" ON "player_ratings" USING btree ("ruleset" int4_ops,"rating" float8_ops);