CREATE TABLE "beatmap_admin_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmap_admin_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated" timestamp with time zone,
	"note" text NOT NULL,
	"reference_id" integer NOT NULL,
	"admin_user_id" integer
);
--> statement-breakpoint
CREATE TABLE "beatmap_audits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "beatmap_audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" bigint,
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference_id_lock" integer NOT NULL,
	"reference_id" integer,
	"action_user_id" integer,
	"action_type" integer NOT NULL,
	"changes" jsonb
);
--> statement-breakpoint
ALTER TABLE "beatmaps" ADD COLUMN "manual_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beatmap_admin_notes" ADD CONSTRAINT "fk_beatmap_admin_notes_beatmaps_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."beatmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_admin_notes" ADD CONSTRAINT "fk_beatmap_admin_notes_users_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_audits" ADD CONSTRAINT "fk_beatmap_audits_audit_events_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beatmap_audits" ADD CONSTRAINT "fk_beatmap_audits_beatmaps_reference_id" FOREIGN KEY ("reference_id") REFERENCES "public"."beatmaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_beatmap_admin_notes_admin_user_id" ON "beatmap_admin_notes" USING btree ("admin_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_admin_notes_reference_id" ON "beatmap_admin_notes" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_action_user_id" ON "beatmap_audits" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_action_user_id_created" ON "beatmap_audits" USING btree ("action_user_id" int4_ops,"created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_created" ON "beatmap_audits" USING btree ("created" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_reference_id" ON "beatmap_audits" USING btree ("reference_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_reference_id_lock" ON "beatmap_audits" USING btree ("reference_id_lock" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_beatmap_audits_changes_gin" ON "beatmap_audits" USING gin ("changes" jsonb_path_ops);--> statement-breakpoint
-- Beatmaps are rewritten by every osu! API refetch, so only deliberate admin
-- edits are audited. System writes leave no row.
CREATE OR REPLACE FUNCTION public.beatmaps_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  action_type integer;
  audit_user_id integer;
  audit_event_id bigint;
  reference_id integer;
  reference_id_fk integer;
BEGIN
  audit_user_id := public.resolve_audit_user_id();

  IF audit_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    old_row := NULL;
    new_row := to_jsonb(NEW);
    reference_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);
    reference_id := NEW.id;
  ELSE
    old_row := to_jsonb(OLD);
    new_row := NULL;
    reference_id := OLD.id;
  END IF;

  changes := public.compute_audit_changes(old_row, new_row);

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_event_id := public.resolve_audit_event_id(audit_user_id);
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO beatmap_audits (
    event_id,
    reference_id_lock,
    reference_id,
    action_user_id,
    action_type,
    changes
  )
  VALUES (
    audit_event_id,
    reference_id,
    reference_id_fk,
    audit_user_id,
    action_type,
    changes
  );

  RETURN NULL;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS beatmaps_audit ON beatmaps;--> statement-breakpoint
CREATE TRIGGER beatmaps_audit
AFTER INSERT OR UPDATE OR DELETE ON beatmaps
FOR EACH ROW
EXECUTE FUNCTION public.beatmaps_audit_trigger();--> statement-breakpoint

-- Manual beatmap data is pinned: an osu! API refetch must never revert it.
CREATE OR REPLACE FUNCTION public.beatmaps_manual_override_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.manual_override AND NOT NEW.manual_override THEN
    RAISE EXCEPTION 'beatmaps.manual_override cannot be cleared';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS beatmaps_manual_override_guard ON beatmaps;--> statement-breakpoint
CREATE TRIGGER beatmaps_manual_override_guard
BEFORE UPDATE ON beatmaps
FOR EACH ROW
EXECUTE FUNCTION public.beatmaps_manual_override_guard();
