ALTER TABLE "beatmaps" ADD COLUMN "title" varchar(512);--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "artist" varchar(512);--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "set_owner_id" integer;--> statement-breakpoint
ALTER TABLE "beatmaps" ADD CONSTRAINT "fk_beatmaps_players_set_owner_id" FOREIGN KEY ("set_owner_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_beatmaps_set_owner_id" ON "beatmaps" USING btree ("set_owner_id" int4_ops);