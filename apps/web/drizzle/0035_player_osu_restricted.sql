ALTER TABLE "players" ADD COLUMN "osu_restricted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- data_fetch_status 3 is NotFound: the osu! API answered 404 on the last fetch
UPDATE "players" SET "osu_restricted" = true WHERE "data_fetch_status" = 3;
