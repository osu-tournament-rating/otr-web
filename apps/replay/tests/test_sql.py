from datetime import UTC, datetime

import pytest

from otr_replay.models import ReplayError
from otr_replay.sql import EXPORT_SQL, parse_counters, render_reconcile

HORIZON = datetime(2026, 7, 28, 12, 0, tzinfo=UTC)


def test_render_reconcile_binds_horizon_and_is_transactional():
    sql = render_reconcile(HORIZON)
    assert sql.count("2026-07-28 12:00:00+00") == 1
    assert sql.startswith("BEGIN;")
    assert sql.rstrip().endswith("COMMIT;")


def test_render_reconcile_only_touches_rating_and_volatility():
    sql = render_reconcile(HORIZON)
    assert "global_rank" not in sql
    assert "country_rank" not in sql
    assert "percentile" not in sql


def test_export_has_exactly_the_five_columns():
    header = EXPORT_SQL.split("SELECT", 1)[1].split("FROM", 1)[0]
    assert [col.strip().split(".")[-1] for col in header.split(",")] == [
        "osu_id",
        "username",
        "ruleset",
        "rating",
        "volatility",
    ]


def test_parse_counters_reads_both_values():
    stdout = "OTR_REPLAY_RATINGS_RESTORED=12\nOTR_REPLAY_ADJUSTMENTS_RECONCILED=34\n"
    result = parse_counters(stdout)
    assert result.ratings_restored == 12
    assert result.adjustments_reconciled == 34


def test_parse_counters_fails_when_a_counter_is_missing():
    with pytest.raises(ReplayError):
        parse_counters("OTR_REPLAY_RATINGS_RESTORED=12\n")
