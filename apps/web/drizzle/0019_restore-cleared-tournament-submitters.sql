-- Restore tournament submitters cleared by the retired admin update path from
-- issue #736. Keep the original audit rows intact and let the tournament audit
-- trigger record each null -> recovered user ID correction as a System event.
--
-- Audit ID 132955 is the final known event produced by the buggy path. The
-- upper bound prevents this one-time repair from consuming future audit data.
-- A production dry run on 2026-07-11 found 285 eligible live tournaments. The
-- migration intentionally derives the count so empty and partial databases
-- remain migratable.

LOCK TABLE users IN SHARE MODE;
--> statement-breakpoint
LOCK TABLE tournaments IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
LOCK TABLE tournament_audits IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint

CREATE TEMP TABLE _otr_736_submitter_clear_sources ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    audit.id AS source_audit_id,
    audit.created AS source_created,
    audit.reference_id_lock AS tournament_id,
    audit.action_user_id,
    COALESCE(
      audit.changes -> 'SubmittedByUserId',
      audit.changes -> 'submittedByUserId',
      audit.changes -> 'submitted_by_user_id'
    ) AS submitted_by_change
  FROM tournament_audits AS audit
  WHERE audit.id <= 132955
    AND audit.action_type = 1
    AND audit.action_user_id IS NOT NULL
    AND jsonb_typeof(audit.changes) = 'object'
    AND (
      audit.changes ? 'SubmittedByUserId'
      OR audit.changes ? 'submittedByUserId'
      OR audit.changes ? 'submitted_by_user_id'
    )
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(audit.changes) AS changed_field(field_name, field_change)
      CROSS JOIN LATERAL (
        SELECT
          COALESCE(
            changed_field.field_change -> 'OriginalValue',
            changed_field.field_change -> 'originalValue',
            changed_field.field_change -> 'original_value'
          ) AS original_value,
          COALESCE(
            changed_field.field_change -> 'NewValue',
            changed_field.field_change -> 'newValue',
            changed_field.field_change -> 'new_value'
          ) AS new_value
      ) AS changed_values
      WHERE changed_field.field_name NOT IN (
        'SubmittedByUserId',
        'submittedByUserId',
        'submitted_by_user_id',
        'VerifiedByUserId',
        'verifiedByUserId',
        'verified_by_user_id'
      )
        AND changed_values.new_value IS DISTINCT FROM changed_values.original_value
    )
), extracted AS (
  SELECT
    source_audit_id,
    source_created,
    tournament_id,
    action_user_id,
    COALESCE(
      submitted_by_change -> 'OriginalValue',
      submitted_by_change -> 'originalValue',
      submitted_by_change -> 'original_value'
    ) AS original_submitter_id,
    COALESCE(
      submitted_by_change -> 'NewValue',
      submitted_by_change -> 'newValue',
      submitted_by_change -> 'new_value'
    ) AS new_submitter_id
  FROM normalized
)
SELECT
  source_audit_id,
  source_created,
  tournament_id,
  action_user_id,
  original_submitter_id
FROM extracted
WHERE original_submitter_id IS NOT NULL
  AND original_submitter_id <> 'null'::jsonb
  AND new_submitter_id = 'null'::jsonb;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _otr_736_submitter_clear_sources AS source
    JOIN tournaments AS tournament ON tournament.id = source.tournament_id
    WHERE tournament.submitted_by_user_id IS NULL
      AND CASE
        WHEN jsonb_typeof(source.original_submitter_id) <> 'number' THEN true
        WHEN (source.original_submitter_id #>> '{}') !~ '^[1-9][0-9]*$' THEN true
        ELSE (source.original_submitter_id #>> '{}')::numeric > 2147483647
      END
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair found an invalid original user ID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _otr_736_submitter_clear_sources AS source
    JOIN tournaments AS tournament ON tournament.id = source.tournament_id
    WHERE tournament.submitted_by_user_id IS NULL
    GROUP BY source.tournament_id
    HAVING COUNT(*) <> 1
      OR COUNT(DISTINCT source.original_submitter_id) <> 1
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair found ambiguous audit history';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _otr_736_submitter_clear_sources AS source
    JOIN tournaments AS tournament ON tournament.id = source.tournament_id
    LEFT JOIN users AS action_user ON action_user.id = source.action_user_id
    WHERE tournament.submitted_by_user_id IS NULL
      AND (
        action_user.id IS NULL
        OR NOT (
          'admin' = ANY(COALESCE(action_user.scopes, ARRAY[]::text[]))
          OR 'superadmin' = ANY(COALESCE(action_user.scopes, ARRAY[]::text[]))
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair found an update without an admin actor';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _otr_736_submitter_clear_sources AS source
    JOIN tournaments AS tournament ON tournament.id = source.tournament_id
    LEFT JOIN users AS submitter
      ON submitter.id = (source.original_submitter_id #>> '{}')::integer
    WHERE tournament.submitted_by_user_id IS NULL
      AND submitter.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair found a missing recovered user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _otr_736_submitter_clear_sources AS source
    JOIN tournaments AS tournament ON tournament.id = source.tournament_id
    WHERE tournament.submitted_by_user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM tournament_audits AS later_audit
        WHERE later_audit.reference_id_lock = source.tournament_id
          AND later_audit.id > source.source_audit_id
          AND (
            later_audit.changes ? 'SubmittedByUserId'
            OR later_audit.changes ? 'submittedByUserId'
            OR later_audit.changes ? 'submitted_by_user_id'
          )
      )
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair found a later submitter audit event';
  END IF;
END;
$$;
--> statement-breakpoint

CREATE TEMP TABLE _otr_736_tournament_submitters ON COMMIT DROP AS
SELECT
  source.tournament_id,
  (source.original_submitter_id #>> '{}')::integer AS submitted_by_user_id,
  source.source_audit_id,
  tournament.updated AS original_updated
FROM _otr_736_submitter_clear_sources AS source
JOIN tournaments AS tournament ON tournament.id = source.tournament_id
JOIN users AS submitter
  ON submitter.id = (source.original_submitter_id #>> '{}')::integer
WHERE tournament.submitted_by_user_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM tournament_audits AS later_audit
    WHERE later_audit.reference_id_lock = source.tournament_id
      AND later_audit.id > source.source_audit_id
      AND (
        later_audit.changes ? 'SubmittedByUserId'
        OR later_audit.changes ? 'submittedByUserId'
        OR later_audit.changes ? 'submitted_by_user_id'
      )
  );
--> statement-breakpoint

DO $$
DECLARE
  candidate_count integer;
  updated_count integer;
  audit_max_id integer;
  repair_audit_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO candidate_count
  FROM _otr_736_tournament_submitters;

  SELECT COALESCE(MAX(id), 0)
  INTO audit_max_id
  FROM tournament_audits;

  -- A migration is a System action unless an operator explicitly supplies an
  -- audit actor. Clear any session value that may have leaked into the runner.
  PERFORM set_config('otr.audit_user_id', '', true);

  UPDATE tournaments AS tournament
  SET submitted_by_user_id = recovered.submitted_by_user_id
  FROM _otr_736_tournament_submitters AS recovered
  WHERE tournament.id = recovered.tournament_id
    AND tournament.submitted_by_user_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> candidate_count THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair expected to update % rows, updated %',
      candidate_count,
      updated_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _otr_736_tournament_submitters AS recovered
    JOIN tournaments AS tournament ON tournament.id = recovered.tournament_id
    WHERE tournament.updated IS DISTINCT FROM recovered.original_updated
  ) THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair unexpectedly changed tournament timestamps';
  END IF;

  SELECT COUNT(*)::integer
  INTO repair_audit_count
  FROM tournament_audits AS audit
  JOIN _otr_736_tournament_submitters AS recovered
    ON recovered.tournament_id = audit.reference_id_lock
  WHERE audit.id > audit_max_id
    AND audit.reference_id = recovered.tournament_id
    AND audit.action_user_id IS NULL
    AND audit.action_type = 1
    AND audit.changes = jsonb_build_object(
      'submitted_by_user_id',
      jsonb_build_object(
        'newValue', to_jsonb(recovered.submitted_by_user_id),
        'originalValue', 'null'::jsonb
      )
    );

  IF repair_audit_count <> candidate_count THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair expected % audit rows, found %',
      candidate_count,
      repair_audit_count;
  END IF;

  IF (SELECT COUNT(*) FROM tournament_audits WHERE id > audit_max_id) <> candidate_count THEN
    RAISE EXCEPTION
      'Issue #736 submitter repair produced unexpected audit rows';
  END IF;
END;
$$;
