-- match_rank_vector (0023) is a generated search column like search_vector, so
-- leave it out of audit changes too. Same signature and body as 0020; only the
-- default excluded_columns change.
CREATE OR REPLACE FUNCTION public.compute_audit_changes(
  old_row jsonb,
  new_row jsonb,
  excluded_columns text[] DEFAULT ARRAY[
    'id',
    'updated',
    'search_vector',
    'match_rank_vector'
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
$$;
