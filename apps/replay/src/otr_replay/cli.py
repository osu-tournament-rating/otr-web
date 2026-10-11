"""Command-line entry point."""

import argparse
import re
import sys
import traceback
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from otr_replay import __version__
from otr_replay.models import ReplayError

_AS_OF = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?Z?$")


def parse_as_of(value: str) -> datetime:
    """Parse a UTC timestamp of the form YYYY-MM-DDTHH:MM[:SS][Z]."""
    match = _AS_OF.match(value)
    if match is None:
        raise argparse.ArgumentTypeError(
            f"{value!r} is not a UTC timestamp of the form YYYY-MM-DDTHH:MM[:SS][Z]"
        )
    year, month, day, hour, minute, second = (int(part or 0) for part in match.groups())
    try:
        return datetime(year, month, day, hour, minute, second, tzinfo=UTC)
    except ValueError as err:
        raise argparse.ArgumentTypeError(f"{value!r}: {err}") from None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="otr-replay",
        description="Reproduces published o!TR player ratings for a point in time.",
    )
    parser.add_argument(
        "--as-of",
        metavar="TIMESTAMP",
        type=parse_as_of,
        required=True,
        help="UTC time the ratings were snapshotted, e.g. 2026-06-27T23:59 or 2026-08-08T00:06:13Z",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    from otr_replay.console import Ui
    from otr_replay.run import execute

    ui = Ui()
    try:
        report = execute(args.as_of, ui, Path.cwd())
    except ReplayError as err:
        ui.failure(err)
        return 1
    except KeyboardInterrupt:
        ui.interrupted()
        return 130
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return 3
    ui.summary(report)
    return 0
