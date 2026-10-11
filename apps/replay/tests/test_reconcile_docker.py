import os
from datetime import UTC, datetime
from pathlib import Path

import pytest

from otr_replay.models import ReplayError
from otr_replay.sandbox import DockerSandbox, require_docker
from otr_replay.sql import EXPORT_SQL, parse_counters, render_reconcile

pytestmark = pytest.mark.skipif(
    os.environ.get("OTR_REPLAY_DOCKER_TEST") != "1",
    reason="set OTR_REPLAY_DOCKER_TEST=1 to run Docker-backed tests",
)

FIXTURES = Path(__file__).parent / "fixtures"
HORIZON = datetime(2026, 7, 28, 12, 0, tzinfo=UTC)

# Player 1 decayed after the horizon in two rulesets; player 2 did not decay.
BASE_ROWS = """
INSERT INTO players VALUES (1, 101, 'one', 'US'), (2, 102, 'two', '');
INSERT INTO player_ratings VALUES
    (1, 1, 0, 1597, 200, 50, 1, 1),
    (2, 2, 0, 1400, 210, 0, 2, 1),
    (3, 1, 1, 897, 305, 10, 1, 1);
INSERT INTO rating_adjustments VALUES
    (1, 1, 0, 1, NULL, 0, '2026-01-01 11:59:59+00', 1500, 1500, 200, 200),
    (2, 1, 0, 1, 10,   2, '2026-06-01 12:00:00+00', 1500, 1600, 200, 190),
    (3, 1, 0, 1, NULL, 1, '2026-07-29 12:00:00+00', 1600, 1597, 190, 195),
    (4, 1, 0, 1, NULL, 3, '2026-08-05 12:00:00+00', 1597, 1597, 195, 200),
    (5, 2, 0, 2, NULL, 0, '2026-06-01 11:59:59+00', 1400, 1400, 210, 210),
    (6, 1, 1, 3, NULL, 0, '2026-05-01 11:59:59+00', 900, 900, 300, 300),
    (7, 1, 1, 3, NULL, 1, '2026-08-05 12:00:00+00', 900, 897, 300, 305);
"""


@pytest.fixture(scope="module")
def sandbox():
    require_docker()
    with DockerSandbox() as box:
        box.start_postgres()
        box.psql_script((FIXTURES / "seed.sql").read_text())
        yield box


@pytest.fixture
def seeded(sandbox):
    sandbox.psql("TRUNCATE players, player_ratings, rating_adjustments")
    sandbox.psql_script(BASE_ROWS)
    return sandbox


def snapshot(box):
    return box.psql("SELECT id, rating, volatility FROM player_ratings ORDER BY id"), box.psql(
        "SELECT id FROM rating_adjustments ORDER BY id"
    )


def test_rollback_restores_each_ruleset_deletes_and_exports(seeded, tmp_path):
    result = parse_counters(seeded.psql_script(render_reconcile(HORIZON), phase="reconcile"))

    assert result.ratings_restored == 2
    assert result.adjustments_reconciled == 3
    assert seeded.psql("SELECT rating, volatility FROM player_ratings WHERE id = 1") == "1600|190"
    assert seeded.psql("SELECT rating, volatility FROM player_ratings WHERE id = 2") == "1400|210"
    assert seeded.psql("SELECT rating, volatility FROM player_ratings WHERE id = 3") == "900|300"
    assert seeded.psql("SELECT count(*) FROM rating_adjustments") == "4"

    csv = tmp_path / "out.csv"
    seeded.copy_out(EXPORT_SQL, csv)
    assert csv.read_text().splitlines() == [
        "osu_id,username,ruleset,rating,volatility",
        "101,one,0,1600,190",
        "102,two,0,1400,210",
        "101,one,1,900,300",
    ]


@pytest.mark.parametrize("adjustment_type", [2, 1])
def test_post_horizon_non_decay_aborts_untouched(seeded, adjustment_type):
    # Type 2 trips the adjustment-type disjunct; type 1 with a match id trips the other.
    seeded.psql_script(
        "INSERT INTO rating_adjustments VALUES "
        f"(100, 1, 0, 1, 99, {adjustment_type}, '2026-07-30 12:00:00+00', 1597, 1610, 200, 195);"
        "UPDATE player_ratings SET rating = 1610, volatility = 195 WHERE id = 1;"
    )
    before = snapshot(seeded)

    with pytest.raises(ReplayError) as exc:
        seeded.psql_script(render_reconcile(HORIZON), phase="reconcile")

    assert exc.value.phase == "reconcile"
    assert "are not decay" in exc.value.hint
    assert snapshot(seeded) == before


def test_rating_disagreeing_with_final_adjustment_aborts_untouched(seeded):
    seeded.psql("UPDATE player_ratings SET rating = 9999 WHERE id = 2")
    before = snapshot(seeded)

    with pytest.raises(ReplayError) as exc:
        seeded.psql_script(render_reconcile(HORIZON), phase="reconcile")

    assert "disagree with their final adjustment" in exc.value.hint
    assert snapshot(seeded) == before


def test_reconcile_is_idempotent(seeded):
    seeded.psql_script(render_reconcile(HORIZON), phase="reconcile")
    second = parse_counters(seeded.psql_script(render_reconcile(HORIZON), phase="reconcile"))
    assert second == type(second)(ratings_restored=0, adjustments_reconciled=0)
