ALTER TABLE "beatmap_attributes" ADD COLUMN "ar" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "od" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "hp" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "cs" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "bpm" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "total_length" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "drain_length" integer NOT NULL;--> statement-breakpoint