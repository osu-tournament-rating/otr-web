"""The web app and data worker, run on the host from the worktree's own code.

Each runs in its own session so it outlives the command that started it, and
stopping it signals that whole process group, which includes the children
Next.js and Bun spawn. A record keeps the PID with its kernel start time, so a
PID the system has since reused is never mistaken for ours.
"""

import hashlib
import json
import os
import signal
import subprocess
import time
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

from lib.stack.common import StackError


@dataclass(frozen=True)
class Record:
    pid: int
    started: int
    env: str


def start_time(pid: int) -> int | None:
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
    except OSError:
        return None
    # The command name in field 2 may contain spaces, so count from its ')'.
    return int(stat.rsplit(")", 1)[1].split()[19])


def env_digest(env: dict[str, str | None]) -> str:
    return hashlib.sha256(json.dumps(env, sort_keys=True).encode()).hexdigest()[:16]


def load(path: Path) -> Record | None:
    try:
        record = Record(**json.loads(path.read_text()))
    except (FileNotFoundError, TypeError, ValueError):
        return None
    return record if start_time(record.pid) == record.started else None


def start(
    path: Path,
    argv: list[str],
    cwd: Path,
    env: dict[str, str],
    digest: str,
    log: Path,
) -> Record:
    """Starts `argv` with exactly `env`. `digest` identifies the settings it
    was started with, so a later `otr up` can tell when it needs a restart."""
    log.parent.mkdir(parents=True, exist_ok=True)
    if log.exists():
        log.replace(log.with_name(log.name + ".1"))
    with log.open("w") as output:
        process = subprocess.Popen(
            argv,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    record = Record(process.pid, start_time(process.pid) or 0, digest)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(record)))
    return record


def stop(path: Path, timeout: float = 15) -> bool:
    """Stops the recorded process group; returns whether one was running."""
    record = load(path)
    path.unlink(missing_ok=True)
    if record is None:
        return False

    try:
        os.killpg(record.pid, signal.SIGTERM)
    except ProcessLookupError:
        return False
    deadline = time.monotonic() + timeout
    while start_time(record.pid) == record.started:
        if time.monotonic() > deadline:
            os.killpg(record.pid, signal.SIGKILL)
            break
        time.sleep(0.2)
    return True


def wait_healthy(record: Record, url: str, log: Path, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while True:
        if start_time(record.pid) != record.started:
            raise StackError(f"It exited during startup:\n{tail(log)}")
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    return
        except OSError:
            pass
        if time.monotonic() > deadline:
            raise StackError(
                f"{url} did not answer within {timeout:.0f}s; it is still "
                f"running.\n{tail(log)}"
            )
        time.sleep(1)


def tail(log: Path, lines: int = 20) -> str:
    try:
        text = log.read_text(errors="replace").splitlines()[-lines:]
    except FileNotFoundError:
        return ""
    return "\n".join(f"  | {line}" for line in text) + f"\n  log: {log}"
