import logging
import subprocess
from subprocess import CalledProcessError

logger = logging.getLogger(__name__)


def run(cmd: list[str]) -> bool:
    """Wraps subprocess.run with logging and error handling"""

    # Run a subprocess, combine stderr with stdout
    # to simplify logging.
    try:
        subprocess.run(cmd, shell=True, check=True)
    except CalledProcessError as e:
        logger.exception(f"Failed to execute process (code {e.returncode})")
        return False

    return True
