import fcntl
import os
import shlex
import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path


class StackError(Exception):
    """A failure otr reports as one line, without a traceback."""


def run(
    cmd: list[str],
    *,
    env: dict[str, str] | None = None,
    cwd: Path | None = None,
) -> str:
    """Runs `cmd` and returns its stdout, raising StackError with the tail of
    stderr on failure. `env` adds to the inherited environment, so secrets
    passed this way stay out of the command line and out of error messages."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env={**os.environ, **env} if env else None,
        cwd=cwd,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()[-5:]
        raise StackError(
            f"`{shlex.join(cmd[:4])} ...` failed (exit {result.returncode}):\n  "
            + "\n  ".join(detail)
        )
    return result.stdout


@contextmanager
def locked(path: Path, shared: bool = False) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as handle:
        fcntl.flock(handle, fcntl.LOCK_SH if shared else fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)
