CREATE TABLE "audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"action_user_id" integer
);
--> statement-breakpoint
ALTER TABLE "game_audits" ADD COLUMN "event_id" bigint;--> statement-breakpoint
ALTER TABLE "game_score_audits" ADD COLUMN "event_id" bigint;--> statement-breakpoint
ALTER TABLE "match_audits" ADD COLUMN "event_id" bigint;--> statement-breakpoint
ALTER TABLE "tournament_audits" ADD COLUMN "event_id" bigint;--> statement-breakpoint
CREATE INDEX "ix_audit_events_action_user_id" ON "audit_events" USING btree ("action_user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "ix_audit_events_created" ON "audit_events" USING btree ("created" timestamptz_ops);--> statement-breakpoint
-- Existing rows all have a null event_id. NOT VALID avoids validating the
-- large legacy audit tables while still enforcing the FK for every new value.
ALTER TABLE "game_audits" ADD CONSTRAINT "fk_game_audits_audit_events_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "game_score_audits" ADD CONSTRAINT "fk_game_score_audits_audit_events_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "match_audits" ADD CONSTRAINT "fk_match_audits_audit_events_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "tournament_audits" ADD CONSTRAINT "fk_tournament_audits_audit_events_event_id" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
-- Event lookups also require the exact transaction-stable created timestamp and
-- use each audit table's existing created index. Deliberately avoid event_id
-- indexes here so this migration does not scan the large legacy audit tables.
-- Audit every business column automatically. The primary key is represented by
-- reference_id(_lock), updated is freshness metadata, and search_vector is generated.
DROP FUNCTION IF EXISTS public.compute_audit_changes(jsonb, jsonb, text[]);--> statement-breakpoint
CREATE FUNCTION public.compute_audit_changes(
  old_row jsonb,
  new_row jsonb,
  excluded_columns text[] DEFAULT ARRAY[
    'id',
    'updated',
    'search_vector'
  ]::text[]
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH normalized AS (
    SELECT
      old_row - excluded_columns AS old_data,
      new_row - excluded_columns AS new_data
  )
  SELECT COALESCE(
    jsonb_object_agg(
      field_name,
      jsonb_build_object(
        'newValue', COALESCE(new_data -> field_name, 'null'::jsonb),
        'originalValue', COALESCE(old_data -> field_name, 'null'::jsonb)
      )
      ORDER BY field_name
    ),
    '{}'::jsonb
  )
  FROM normalized
  CROSS JOIN LATERAL jsonb_object_keys(
    COALESCE(old_data, '{}'::jsonb) || COALESCE(new_data, '{}'::jsonb)
  ) AS fields(field_name)
  WHERE COALESCE(old_data -> field_name, 'null'::jsonb)
    IS DISTINCT FROM COALESCE(new_data -> field_name, 'null'::jsonb);
$$;--> statement-breakpoint

-- Allocate one durable audit event per PostgreSQL transaction. The setting is
-- transaction-local and the transaction token prevents stale pooled state reuse.
CREATE OR REPLACE FUNCTION public.resolve_audit_event_id(
  p_action_user_id integer
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_token text := pg_current_xact_id()::text;
  raw_setting text := current_setting('otr.audit_event_id', true);
  resolved_event_id bigint;
BEGIN
  IF COALESCE(raw_setting, '') ~ '^[0-9]+:[0-9]+$'
    AND split_part(raw_setting, ':', 1) = transaction_token THEN
    BEGIN
      resolved_event_id := split_part(raw_setting, ':', 2)::bigint;
    EXCEPTION
      WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        resolved_event_id := NULL;
    END;

    IF resolved_event_id IS NOT NULL THEN
      RETURN resolved_event_id;
    END IF;
  END IF;

  INSERT INTO audit_events (action_user_id)
  VALUES (p_action_user_id)
  RETURNING id INTO resolved_event_id;

  PERFORM set_config(
    'otr.audit_event_id',
    transaction_token || ':' || resolved_event_id,
    true
  );

  RETURN resolved_event_id;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.tournaments_audit_trigger()
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

  audit_user_id := public.resolve_audit_user_id();
  audit_event_id := public.resolve_audit_event_id(audit_user_id);
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO tournament_audits (
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

CREATE OR REPLACE FUNCTION public.matches_audit_trigger()
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

  audit_user_id := public.resolve_audit_user_id();
  audit_event_id := public.resolve_audit_event_id(audit_user_id);
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO match_audits (
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

CREATE OR REPLACE FUNCTION public.games_audit_trigger()
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

  audit_user_id := public.resolve_audit_user_id();
  audit_event_id := public.resolve_audit_event_id(audit_user_id);
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO game_audits (
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

CREATE OR REPLACE FUNCTION public.game_scores_audit_trigger()
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

  audit_user_id := public.resolve_audit_user_id();
  audit_event_id := public.resolve_audit_event_id(audit_user_id);
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO game_score_audits (
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
$$;
