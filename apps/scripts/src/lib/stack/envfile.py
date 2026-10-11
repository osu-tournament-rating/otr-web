"""The worktree's root `.env`, which every app, migration, and the processor read.

`otr up` points it at the worktree's own stack, so any command an agent runs in
the worktree uses that stack and never the main checkout's services.
"""

import os
import re
import shutil
from pathlib import Path

BEGIN = "# >>> otr stack: written by apps/scripts/otr; `otr up` rewrites this block"
END = "# <<< otr stack"

_assignment = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$")


def parse(text: str) -> dict[str, str]:
    """Reads `KEY=value` lines as dotenv does for the values otr needs; the
    last assignment of a key wins."""
    values: dict[str, str] = {}
    for line in text.splitlines():
        match = _assignment.match(line)
        if not match:
            continue
        raw = match.group(2).strip()
        if len(raw) >= 2 and raw[0] in "\"'" and raw[-1] == raw[0]:
            value = raw[1:-1]
        else:
            value = raw.split(" #", 1)[0].strip()
        values[match.group(1)] = value
    return values


def apply(text: str, managed: dict[str, str | None]) -> str:
    """Returns `text` with every assignment of a managed key replaced by one
    block at the end. A key whose value is None is removed, so it is unset."""
    kept: list[str] = []
    inside = False
    for line in text.splitlines():
        if line.strip() == BEGIN:
            inside = True
            continue
        if inside:
            inside = line.strip() != END
            continue
        match = _assignment.match(line)
        if match and match.group(1) in managed:
            continue
        kept.append(line)

    while kept and not kept[-1].strip():
        kept.pop()

    block = [f"{key}={value}" for key, value in managed.items() if value is not None]
    return "\n".join([*kept, "", BEGIN, *block, END]) + "\n"


def ensure(root: Path, main: Path) -> Path:
    """Makes sure the worktree has its own `.env`, copying the main checkout's
    when it has none. A symlinked `.env` becomes a copy, so otr never writes
    through it into the main checkout's file."""
    env = root / ".env"
    if env.is_symlink():
        text = env.read_text()
        env.unlink()
        env.write_text(text)
    elif not env.exists():
        source = main / ".env"
        if not source.is_file():
            raise FileNotFoundError(
                f"Neither {env} nor {source} exists; create the main checkout's "
                ".env from .env.example first"
            )
        shutil.copyfile(source, env)
    return env


def write(env: Path, managed: dict[str, str | None]) -> None:
    updated = apply(env.read_text(), managed)
    temporary = env.with_name(".env.otr-tmp")
    temporary.write_text(updated)
    os.chmod(temporary, env.stat().st_mode & 0o777)
    os.replace(temporary, env)
