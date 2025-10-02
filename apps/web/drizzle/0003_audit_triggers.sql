CREATE OR REPLACE FUNCTION public.resolve_audit_user_id()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  raw_setting text;
BEGIN
  raw_setting := current_setting('otr.audit_user_id', true);

  IF raw_setting IS NULL OR btrim(raw_setting) = '' THEN
    RETURN NULL;
  END IF;

  RETURN raw_setting::integer;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_audit_changes(
  old_row jsonb,
  new_row jsonb,
  tracked_columns text[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
  column_name text;
  old_value jsonb;
  new_value jsonb;
BEGIN
  FOREACH column_name IN ARRAY tracked_columns LOOP
    IF old_row IS NULL THEN
      old_value := NULL;
    ELSE
      old_value := old_row -> column_name;
    END IF;

    IF new_row IS NULL THEN
      new_value := NULL;
    ELSE
      new_value := new_row -> column_name;
    END IF;

    IF old_value IS DISTINCT FROM new_value THEN
      changes := changes || jsonb_build_object(
        column_name,
        jsonb_build_object(
          'newValue', COALESCE(new_value, 'null'::jsonb),
          'originalValue', COALESCE(old_value, 'null'::jsonb)
        )
      );
    END IF;
  END LOOP;

  RETURN changes;
END;
$$;

CREATE OR REPLACE FUNCTION public.to_camel_case(identifier text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT CASE
    WHEN identifier IS NULL OR identifier = '' THEN identifier
    ELSE lower(left(identifier, 1)) || substring(identifier FROM 2)
  END;
$$;

CREATE OR REPLACE FUNCTION public.camelize_changes_json(payload jsonb)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT COALESCE(
    jsonb_object_agg(public.to_camel_case(key), value),
    '{}'::jsonb
  )
  FROM jsonb_each(payload);
$$;

CREATE OR REPLACE FUNCTION public.tournaments_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tracked_columns text[] := ARRAY[
    'name',
    'abbreviation',
    'forum_url',
    'rank_range_lower_bound',
    'ruleset',
    'lobby_size',
    'verification_status',
    'rejection_reason',
    'submitted_by_user_id',
    'verified_by_user_id',
    'start_time',
    'end_time',
    'created'
  ];
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  action_type integer;
  audit_user_id integer;
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

  changes := public.compute_audit_changes(old_row, new_row, tracked_columns);

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_user_id := public.resolve_audit_user_id();
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO tournament_audits (
    reference_id_lock,
    reference_id,
    action_user_id,
    action_type,
    changes
  )
  VALUES (
    reference_id,
    reference_id_fk,
    audit_user_id,
    action_type,
    changes
  );

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.matches_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tracked_columns text[] := ARRAY[
    'osu_id',
    'name',
    'start_time',
    'end_time',
    'verification_status',
    'rejection_reason',
    'warning_flags',
    'tournament_id',
    'submitted_by_user_id',
    'verified_by_user_id',
    'created',
    'data_fetch_status'
  ];
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  action_type integer;
  audit_user_id integer;
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

  changes := public.compute_audit_changes(old_row, new_row, tracked_columns);

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_user_id := public.resolve_audit_user_id();
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO match_audits (
    reference_id_lock,
    reference_id,
    action_user_id,
    action_type,
    changes
  )
  VALUES (
    reference_id,
    reference_id_fk,
    audit_user_id,
    action_type,
    changes
  );

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.games_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tracked_columns text[] := ARRAY[
    'osu_id',
    'ruleset',
    'scoring_type',
    'team_type',
    'mods',
    'start_time',
    'end_time',
    'verification_status',
    'rejection_reason',
    'warning_flags',
    'match_id',
    'beatmap_id',
    'created',
    'play_mode'
  ];
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  action_type integer;
  audit_user_id integer;
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

  changes := public.compute_audit_changes(old_row, new_row, tracked_columns);

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_user_id := public.resolve_audit_user_id();
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO game_audits (
    reference_id_lock,
    reference_id,
    action_user_id,
    action_type,
    changes
  )
  VALUES (
    reference_id,
    reference_id_fk,
    audit_user_id,
    action_type,
    changes
  );

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.game_scores_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tracked_columns text[] := ARRAY[
    'score',
    'placement',
    'max_combo',
    'count50',
    'count100',
    'count300',
    'count_miss',
    'count_katu',
    'count_geki',
    'pass',
    'perfect',
    'grade',
    'mods',
    'team',
    'ruleset',
    'verification_status',
    'rejection_reason',
    'game_id',
    'player_id',
    'created'
  ];
  old_row jsonb;
  new_row jsonb;
  changes jsonb;
  action_type integer;
  audit_user_id integer;
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

  changes := public.compute_audit_changes(old_row, new_row, tracked_columns);

  IF changes = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  audit_user_id := public.resolve_audit_user_id();
  action_type := CASE TG_OP WHEN 'INSERT' THEN 0 WHEN 'UPDATE' THEN 1 ELSE 2 END;
  reference_id_fk := CASE TG_OP WHEN 'DELETE' THEN NULL ELSE reference_id END;

  INSERT INTO game_score_audits (
    reference_id_lock,
    reference_id,
    action_user_id,
    action_type,
    changes
  )
  VALUES (
    reference_id,
    reference_id_fk,
    audit_user_id,
    action_type,
    changes
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_audit ON tournaments;
CREATE TRIGGER trg_tournaments_audit
AFTER INSERT OR UPDATE OR DELETE ON tournaments
FOR EACH ROW EXECUTE FUNCTION public.tournaments_audit_trigger();

DROP TRIGGER IF EXISTS trg_matches_audit ON matches;
CREATE TRIGGER trg_matches_audit
AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH ROW EXECUTE FUNCTION public.matches_audit_trigger();

DROP TRIGGER IF EXISTS trg_games_audit ON games;
CREATE TRIGGER trg_games_audit
AFTER INSERT OR UPDATE OR DELETE ON games
FOR EACH ROW EXECUTE FUNCTION public.games_audit_trigger();

DROP TRIGGER IF EXISTS trg_game_scores_audit ON game_scores;
CREATE TRIGGER trg_game_scores_audit
AFTER INSERT OR UPDATE OR DELETE ON game_scores
FOR EACH ROW EXECUTE FUNCTION public.game_scores_audit_trigger();

UPDATE tournament_audits
SET changes = public.camelize_changes_json(changes)
WHERE changes IS NOT NULL
  AND jsonb_typeof(changes) = 'object'
  AND changes <> '{}'::jsonb;

UPDATE match_audits
SET changes = public.camelize_changes_json(changes)
WHERE changes IS NOT NULL
  AND jsonb_typeof(changes) = 'object'
  AND changes <> '{}'::jsonb;

UPDATE game_audits
SET changes = public.camelize_changes_json(changes)
WHERE changes IS NOT NULL
  AND jsonb_typeof(changes) = 'object'
  AND changes <> '{}'::jsonb;

UPDATE game_score_audits
SET changes = public.camelize_changes_json(changes)
WHERE changes IS NOT NULL
  AND jsonb_typeof(changes) = 'object'
  AND changes <> '{}'::jsonb;
