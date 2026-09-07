CREATE TABLE "beatmap_attribute_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"beatmap_id" integer NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"requested_settings" jsonb NOT NULL,
	"refresh_source" boolean DEFAULT false NOT NULL,
	"source_file_id" integer,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"desired_calculator_version" text NOT NULL,
	"desired_format_version" integer NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_code" text,
	CONSTRAINT "beatmap_attribute_jobs_status_check" CHECK ("beatmap_attribute_jobs"."status" in ('pending', 'processing', 'complete', 'failed')),
	CONSTRAINT "beatmap_attribute_jobs_generation_check" CHECK ("beatmap_attribute_jobs"."generation" > 0 and "beatmap_attribute_jobs"."attempts" >= 0 and "beatmap_attribute_jobs"."desired_format_version" > 0),
	CONSTRAINT "beatmap_attribute_jobs_requests_check" CHECK (jsonb_typeof("beatmap_attribute_jobs"."requested_settings") = 'array' and jsonb_array_length("beatmap_attribute_jobs"."requested_settings") between 1 and 64)
);
--> statement-breakpoint
CREATE TABLE "beatmap_files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmap_files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"beatmap_id" integer NOT NULL,
	"provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"byte_length" integer NOT NULL,
	"osu_beatmap_id" bigint NOT NULL,
	"source_url" text NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_mode" integer NOT NULL,
	"key_count" integer,
	CONSTRAINT "beatmap_files_id_beatmap_checksum_key" UNIQUE("id","beatmap_id","checksum"),
	CONSTRAINT "beatmap_files_id_beatmap_key" UNIQUE("id","beatmap_id"),
	CONSTRAINT "beatmap_files_provider_check" CHECK ("beatmap_files"."provider" in ('local', 'gcp')),
	CONSTRAINT "beatmap_files_checksum_check" CHECK ("beatmap_files"."checksum" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "beatmap_files_byte_length_check" CHECK ("beatmap_files"."byte_length" > 0),
	CONSTRAINT "beatmap_files_osu_id_check" CHECK ("beatmap_files"."osu_beatmap_id" > 0),
	CONSTRAINT "beatmap_files_mode_keys_check" CHECK (("beatmap_files"."source_mode" in (0, 1, 2) and "beatmap_files"."key_count" is null) or ("beatmap_files"."source_mode" = 3 and "beatmap_files"."key_count" is not null and "beatmap_files"."key_count" > 0))
);
--> statement-breakpoint
DROP INDEX "ix_beatmap_attributes_beatmap_id_mods";--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "file_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "checksum" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "identity" text NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "ruleset" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "settings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "calculator_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "format_version" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "ar" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "od" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "cs" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "hp_drain" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "bpm" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "max_combo" integer;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "clock_rate" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "total_length" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "drain_length" double precision;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "hit_windows" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD COLUMN "difficulty" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" ADD CONSTRAINT "beatmap_attribute_jobs_beatmap_id_beatmaps_id_fk" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_attribute_jobs" ADD CONSTRAINT "beatmap_attribute_jobs_source_beatmap_fk" FOREIGN KEY ("source_file_id","beatmap_id") REFERENCES "public"."beatmap_files"("id","beatmap_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_files" ADD CONSTRAINT "beatmap_files_beatmap_id_beatmaps_id_fk" FOREIGN KEY ("beatmap_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beatmap_attribute_jobs_beatmap_key" ON "beatmap_attribute_jobs" USING btree ("beatmap_id");--> statement-breakpoint
CREATE INDEX "beatmap_attribute_jobs_schedule_idx" ON "beatmap_attribute_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "beatmap_attribute_jobs_lease_idx" ON "beatmap_attribute_jobs" USING btree ("lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "beatmap_files_beatmap_provider_checksum_key" ON "beatmap_files" USING btree ("beatmap_id","provider","checksum");--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_source_beatmap_checksum_fk" FOREIGN KEY ("file_id","beatmap_id","checksum") REFERENCES "public"."beatmap_files"("id","beatmap_id","checksum") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "beatmap_attributes_source_identity_key" ON "beatmap_attributes" USING btree ("beatmap_id","file_id","identity");--> statement-breakpoint
CREATE INDEX "beatmap_attributes_lookup_idx" ON "beatmap_attributes" USING btree ("beatmap_id","ruleset","mods");--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_ruleset_check" CHECK ("beatmap_attributes"."ruleset" between 0 and 5);--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_mods_check" CHECK ("beatmap_attributes"."mods" in (0, 2, 8, 16, 64, 1024));--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_version_check" CHECK ("beatmap_attributes"."format_version" > 0);--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_values_check" CHECK ("beatmap_attributes"."sr" >= 0 and "beatmap_attributes"."sr" < 'Infinity'::float8 and "beatmap_attributes"."clock_rate" between 0.01 and 100 and ("beatmap_attributes"."max_combo" is null or "beatmap_attributes"."max_combo" >= 0));--> statement-breakpoint
ALTER TABLE "beatmap_attributes" ADD CONSTRAINT "beatmap_attributes_duration_check" CHECK (("beatmap_attributes"."total_length" is null or ("beatmap_attributes"."total_length" >= 0 and "beatmap_attributes"."total_length" < 'Infinity'::float8)) and ("beatmap_attributes"."drain_length" is null or ("beatmap_attributes"."drain_length" >= 0 and "beatmap_attributes"."drain_length" < 'Infinity'::float8)) and ("beatmap_attributes"."total_length" is null or "beatmap_attributes"."drain_length" is null or "beatmap_attributes"."drain_length" <= "beatmap_attributes"."total_length"));