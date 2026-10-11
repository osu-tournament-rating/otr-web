"""Data passed between pipeline stages."""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


class ReplayError(Exception):
    """A failure in a named pipeline phase, with an optional remediation hint."""

    def __init__(self, phase: str, message: str, hint: str = "") -> None:
        super().__init__(message)
        self.phase = phase
        self.message = message
        self.hint = hint


@dataclass(frozen=True, slots=True)
class ReplicaRef:
    name: str
    url: str
    timestamp: datetime


@dataclass(frozen=True, slots=True)
class Replica:
    ref: ReplicaRef
    path: Path
    sha256: str


@dataclass(frozen=True, slots=True)
class Release:
    tag: str
    published_at: datetime
    pushed_at: datetime
    digest: str
    # The GitHub repository and release page the release was discovered from.
    repository: str | None = None
    html_url: str | None = None

    @property
    def usable_at(self) -> datetime:
        return max(self.published_at, self.pushed_at)

    @property
    def image(self) -> str:
        return f"stagecodes/otr-processor@{self.digest}"


@dataclass(frozen=True, slots=True)
class Reconciliation:
    ratings_restored: int
    adjustments_reconciled: int


@dataclass(frozen=True, slots=True)
class Report:
    requested_at: datetime
    replica: Replica
    release: Release
    reconciliation: Reconciliation
    row_count: int
    started_at: datetime
    finished_at: datetime
    csv_path: Path
    metadata_path: Path
    csv_sha256: str
    postgres_image: str
    source_commit: str | None
