import argparse
from datetime import UTC, datetime

import pytest

from otr_replay.cli import build_parser, parse_as_of


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("2026-06-27T23:59", datetime(2026, 6, 27, 23, 59, tzinfo=UTC)),
        ("2026-06-27T23:59:30", datetime(2026, 6, 27, 23, 59, 30, tzinfo=UTC)),
        ("2026-06-27T23:59Z", datetime(2026, 6, 27, 23, 59, tzinfo=UTC)),
        ("2026-08-08T00:06:13Z", datetime(2026, 8, 8, 0, 6, 13, tzinfo=UTC)),
    ],
)
def test_parse_as_of_accepts_utc_forms(value, expected):
    assert parse_as_of(value) == expected


@pytest.mark.parametrize(
    "value",
    [
        "2026-06-27T23:59+00:00",
        "2026-06-27T23:59z",
        "2026-06-27T23:59:30.5",
        "2026-06-27t23:59",
        "2026-06-27 23:59",
        "2026-06-27",
        "2026-13-01T00:00",
        "2026-02-30T00:00",
    ],
)
def test_parse_as_of_rejects_offsets_and_malformed_forms(value):
    with pytest.raises(argparse.ArgumentTypeError):
        parse_as_of(value)


def test_as_of_is_required():
    with pytest.raises(SystemExit) as exc:
        build_parser().parse_args([])
    assert exc.value.code == 2


def test_release_alias_is_not_accepted():
    with pytest.raises(SystemExit) as exc:
        build_parser().parse_args(["--release", "2026-06-27T23:59Z"])
    assert exc.value.code == 2
