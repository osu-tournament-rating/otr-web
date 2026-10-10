import logging
from pathlib import Path
from subprocess import run

logger = logging.getLogger(__name__)


def hash(p: Path) -> Path:
    """
    Hashes a file and saves the hash as a .sha256 file.
    Returns a path to the hash
    """
    logger.info(f"Hashing {p}")
    output_loc = p.parent / f"{p.name}.sha256"
    run(
        f"sha256sum {p.name} > {output_loc.name}",
        cwd=p.parent,
        shell=True,
        check=True,
    )

    logger.info(f"Hash saved to {output_loc}")

    return output_loc
