ALTER TABLE "players" ALTER COLUMN "osu_track_last_fetch" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "osu_track_last_fetch" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "player_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_player_id_key" ON "auth_users" USING btree ("player_id");