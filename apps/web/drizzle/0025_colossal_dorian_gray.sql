ALTER TABLE "beatmaps" ADD COLUMN "title_override" varchar(512);--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "artist_override" varchar(512);--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "set_owner_id_override" integer;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD CONSTRAINT "fk_beatmaps_players_set_owner_id_override" FOREIGN KEY ("set_owner_id_override") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_beatmaps_set_owner_id_override" ON "beatmaps" USING btree ("set_owner_id_override" int4_ops);