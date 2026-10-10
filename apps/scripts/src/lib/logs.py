import logging
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

LOG_FORMAT = "%(asctime)s [%(levelname)s]: %(message)s"


def init():
    """Configures console logging for the process"""
    logging.basicConfig(
        level=logging.INFO,
        handlers=[logging.StreamHandler()],
        format=LOG_FORMAT,
    )


@contextmanager
def script_log(log_dir: Path, script: str):
    """Routes logs emitted within the context to a log file for this script"""
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    log_dir.mkdir(parents=True, exist_ok=True)

    log_path = log_dir / f"{script}_{timestamp}.log"

    handler = logging.FileHandler(log_path)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))

    root = logging.getLogger()
    root.addHandler(handler)

    try:
        yield log_path
    finally:
        root.removeHandler(handler)
        handler.close()
