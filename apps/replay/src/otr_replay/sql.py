"""SQL executed inside the temporary database."""

import re
from datetime import datetime

from otr_replay.models import Reconciliation, ReplayError

# Fabricated adjustments are decay ticks the processor applied past the replica
# timestamp because its final decay pass always runs to the wall clock. Only whole
# Decay (1) and VolatilityDecay (3) rows are removed, restoring the exact values
# they recorded; anything else past the horizon aborts the transaction untouched.
_BODY = """
DO $ready$ BEGIN
  IF (SELECT count(*) FROM player_ratings) = 0 THEN
    RAISE EXCEPTION 'otr-replay: the processor produced no player ratings';
  END IF;
END $ready$;

DO $guard$
DECLARE horizon timestamptz := current_setting('otr.horizon')::timestamptz;
        offenders bigint; examples text;
BEGIN
  WITH bad AS (
    SELECT player_id, ruleset, adjustment_type, match_id, "timestamp",
           row_number() OVER (ORDER BY "timestamp", id) AS rn
    FROM rating_adjustments
    WHERE "timestamp" > horizon
      AND (adjustment_type NOT IN (1, 3) OR match_id IS NOT NULL))
  SELECT count(*), string_agg(format('player %s ruleset %s type %s match %s at %s',
           player_id, ruleset, adjustment_type, coalesce(match_id::text, 'none'),
           "timestamp"), '; ' ORDER BY rn) FILTER (WHERE rn <= 5)
  INTO offenders, examples FROM bad;
  IF offenders > 0 THEN
    RAISE EXCEPTION
      'otr-replay: % adjustment(s) after % are not decay; cannot reconcile. Examples: %',
      offenders, horizon, coalesce(examples, 'none');
  END IF;
END $guard$;

WITH earliest AS (
  SELECT DISTINCT ON (player_id, ruleset)
         player_id, ruleset, rating_before, volatility_before
  FROM rating_adjustments
  WHERE "timestamp" > current_setting('otr.horizon')::timestamptz
  ORDER BY player_id, ruleset, "timestamp", id),
restored AS (
  UPDATE player_ratings pr
  SET rating = earliest.rating_before, volatility = earliest.volatility_before
  FROM earliest
  WHERE pr.player_id = earliest.player_id AND pr.ruleset = earliest.ruleset
  RETURNING 1)
SELECT 'OTR_REPLAY_RATINGS_RESTORED=' || count(*) FROM restored;

WITH deleted AS (
  DELETE FROM rating_adjustments
  WHERE "timestamp" > current_setting('otr.horizon')::timestamptz
    AND adjustment_type IN (1, 3)
  RETURNING 1)
SELECT 'OTR_REPLAY_ADJUSTMENTS_RECONCILED=' || count(*) FROM deleted;

DO $assert$
DECLARE violations bigint; examples text;
BEGIN
  WITH bad AS (
    SELECT pr.player_id, pr.ruleset,
           row_number() OVER (ORDER BY pr.player_id, pr.ruleset) AS rn
    FROM player_ratings pr
    LEFT JOIN LATERAL (
      SELECT ra.rating_after, ra.volatility_after
      FROM rating_adjustments ra
      WHERE ra.player_id = pr.player_id AND ra.ruleset = pr.ruleset
      ORDER BY ra."timestamp" DESC, ra.id DESC LIMIT 1) final ON TRUE
    WHERE pr.rating IS DISTINCT FROM final.rating_after
       OR pr.volatility IS DISTINCT FROM final.volatility_after)
  SELECT count(*), string_agg(format('player %s ruleset %s', player_id, ruleset), '; '
           ORDER BY rn) FILTER (WHERE rn <= 5)
  INTO violations, examples FROM bad;
  IF violations > 0 THEN
    RAISE EXCEPTION
      'otr-replay: % rating(s) disagree with their final adjustment. Examples: %',
      violations, coalesce(examples, 'none');
  END IF;
END $assert$;
"""

EXPORT_SQL = """COPY (
    SELECT p.osu_id, p.username, pr.ruleset, pr.rating, pr.volatility
    FROM public.players p
    JOIN public.player_ratings pr ON p.id = pr.player_id
    ORDER BY pr.ruleset, pr.rating DESC, p.osu_id
) TO STDOUT WITH (FORMAT CSV, HEADER TRUE)"""

ROW_COUNT_SQL = (
    "SELECT count(*) FROM public.players p " "JOIN public.player_ratings pr ON p.id = pr.player_id"
)

_COUNTER = re.compile(r"^OTR_REPLAY_([A-Z_]+)=(\d+)$", re.MULTILINE)


def render_reconcile(horizon: datetime) -> str:
    """Render the fail-closed reconciliation transaction for a UTC horizon."""
    return (
        "BEGIN;\n"
        "SET LOCAL TIME ZONE 'UTC';\n"
        f"SET LOCAL otr.horizon = '{horizon:%Y-%m-%d %H:%M:%S}+00';\n"
        f"{_BODY}\n"
        "COMMIT;\n"
    )


def parse_counters(stdout: str) -> Reconciliation:
    counters = {name: int(value) for name, value in _COUNTER.findall(stdout)}
    try:
        return Reconciliation(
            ratings_restored=counters["RATINGS_RESTORED"],
            adjustments_reconciled=counters["ADJUSTMENTS_RECONCILED"],
        )
    except KeyError as err:
        raise ReplayError(
            "reconcile", f"the reconciliation transaction did not report {err.args[0]}"
        ) from None
