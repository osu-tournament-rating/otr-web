ALTER TABLE "beatmap_attribute_jobs" DROP CONSTRAINT "beatmap_attribute_jobs_requests_check";--> statement-breakpoint
ALTER TABLE "beatmap_attributes" DROP CONSTRAINT "beatmap_attributes_duration_check";--> statement-breakpoint
ALTER TABLE "beatmap_files" DROP CONSTRAINT "beatmap_files_mode_keys_check";--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "storage_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "checksum" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "byte_length" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "acquired_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "acquired_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_files" ALTER COLUMN "source_mode" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" ADD COLUMN "acquired_file_id" integer;--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD COLUMN "fetch_status" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD COLUMN "last_fetch_attempt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" ADD CONSTRAINT "beatmap_attribute_jobs_acquired_beatmap_fk" FOREIGN KEY ("acquired_file_id","beatmap_id") REFERENCES "public"."beatmap_files"("id","beatmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" DROP COLUMN "source_metadata_updated_at";--> statement-breakpoint
ALTER TABLE "beatmap_attributes" DROP COLUMN "total_length";--> statement-breakpoint
ALTER TABLE "beatmap_attributes" DROP COLUMN "drain_length";--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" ADD CONSTRAINT "beatmap_attribute_jobs_requests_check" CHECK (jsonb_typeof("beatmap_attribute_jobs"."requested_settings") = 'array' and jsonb_array_length("beatmap_attribute_jobs"."requested_settings") between 1 and 6);--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD CONSTRAINT "beatmap_files_fetch_status_check" CHECK ("beatmap_files"."fetch_status" between 0 and 4);--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD CONSTRAINT "beatmap_files_fetched_check" CHECK ("beatmap_files"."fetch_status" != 2 or ("beatmap_files"."checksum" is not null and "beatmap_files"."storage_key" is not null and "beatmap_files"."storage_key" ~ '^sha256/[a-f0-9]{2}/[a-f0-9]{64}[.]osu$' and "beatmap_files"."byte_length" is not null and "beatmap_files"."byte_length" > 0 and "beatmap_files"."acquired_at" is not null));--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD CONSTRAINT "beatmap_files_mode_keys_check" CHECK (coalesce(("beatmap_files"."source_mode" is null and "beatmap_files"."key_count" is null) or ("beatmap_files"."source_mode" in (0, 1, 2) and "beatmap_files"."key_count" is null) or ("beatmap_files"."source_mode" = 3 and "beatmap_files"."key_count" is not null and "beatmap_files"."key_count" > 0), false));