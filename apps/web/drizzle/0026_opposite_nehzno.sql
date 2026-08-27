-- Beatmap audits only for updates to a manually overridden beatmap.
CREATE OR REPLACE FUNCTION public.beatmaps_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  changes jsonb;
  audit_user_id integer;
  audit_event_id bigint;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NULL;
  END IF;

  IF NOT NEW.manual_override THEN
    RETURN NULL;
  END IF;

  audit_user_id := public.resolve_audit_user_id();

  IF audit_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  changes := public.compute_audit_changes(to_jsonb(OLD), to_jsonb(NEW));

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_event_id := public.resolve_audit_event_id(audit_user_id);

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
    NEW.id,
    NEW.id,
    audit_user_id,
    1,
    changes
  );

  RETURN NULL;
END;
$$;
