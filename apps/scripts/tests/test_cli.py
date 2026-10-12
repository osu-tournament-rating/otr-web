import sys

import pytest

from lib import cli


def test_script_flag_needs_a_script(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["main.py", "-s"])

    with pytest.raises(SystemExit) as excinfo:
        cli.init()

    assert excinfo.value.code == 2


def test_script_flag_takes_several_scripts(monkeypatch):
    monkeypatch.setattr(
        sys,
        "argv",
        ["main.py", "-s", "archive", "processor", "--archive-bucket", "dev"],
    )

    assert cli.init().scripts == ["archive", "processor"]
