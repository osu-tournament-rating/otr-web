import hashlib
import os
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import pytest
from dotenv import dotenv_values
from google.cloud import storage

pytestmark = pytest.mark.e2e

REPO_ROOT = Path(__file__).resolve().parents[2]
POSTGRES_IMAGE = "postgres:17"
POSTGRES_PASSWORD = "postgres"
DEFAULT_POSTGRES_USER = "postgres"
DEFAULT_POSTGRES_DB = "otr_public_import_e2e"
POSTGRES_STARTUP_TIMEOUT_SECONDS = 90
IMPORT_TIMEOUT_SECONDS = int(os.getenv("OTR_E2E_IMPORT_TIMEOUT_SECONDS", "1800"))
OUTPUT_LIMIT = 4000


@dataclass(frozen=True)
class PublicArchive:
    archive_path: Path
    hash_path: Path
    blob_name: str


def test_latest_public_replica_archive_imports_into_postgres_17(tmp_path: Path):
    archive = download_latest_public_archive(tmp_path)
    assert_sha256_matches(archive)

    container = start_postgres_container()
    try:
        restore_archive(container, archive.archive_path)
    finally:
        container.stop()


def download_latest_public_archive(out_dir: Path) -> PublicArchive:
    bucket_name = required_config("GCS_PUBLIC_BUCKET")
    client = storage_client()

    archives = [
        blob
        for blob in client.list_blobs(bucket_name)
        if blob.name.endswith(".gz")
    ]
    assert archives, f"No public archive blobs ending in .gz found in {bucket_name}"

    latest = max(archives, key=lambda blob: blob.time_created)
    archive_path = out_dir / Path(latest.name).name
    latest.download_to_filename(str(archive_path))

    hash_blob_name = f"{latest.name}.sha256"
    hash_blob = client.bucket(bucket_name).blob(hash_blob_name)
    assert hash_blob.exists(client), (
        f"Missing SHA256 object for latest archive: gs://{bucket_name}/{hash_blob_name}"
    )

    hash_path = out_dir / Path(hash_blob_name).name
    hash_blob.download_to_filename(str(hash_path))

    return PublicArchive(
        archive_path=archive_path,
        hash_path=hash_path,
        blob_name=latest.name,
    )


def storage_client() -> storage.Client:
    sa_json_path = optional_config("GCS_SA_JSON_PATH")
    if sa_json_path:
        return storage.Client.from_service_account_json(
            str(Path(sa_json_path).expanduser())
        )

    return storage.Client()


def required_config(key: str) -> str:
    value = optional_config(key)
    assert value, f"Missing required e2e configuration: {key}"
    return value


def optional_config(key: str) -> str | None:
    if key in os.environ:
        return os.environ[key]

    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        return None

    value = dotenv_values(env_file).get(key)
    return value or None


def assert_sha256_matches(archive: PublicArchive):
    hash_lines = archive.hash_path.read_text().strip().splitlines()
    assert len(hash_lines) == 1, (
        f"Expected exactly one SHA256 line in {archive.hash_path}, found "
        f"{len(hash_lines)}"
    )

    expected_hash, hashed_filename = parse_sha256_line(hash_lines[0])
    actual_hash = sha256(archive.archive_path)

    assert Path(hashed_filename).name == archive.archive_path.name, (
        f"SHA256 file references {hashed_filename}, but downloaded "
        f"{archive.blob_name} as {archive.archive_path.name}"
    )
    assert actual_hash == expected_hash, (
        f"SHA256 mismatch for {archive.blob_name}: expected {expected_hash}, "
        f"got {actual_hash}"
    )


def parse_sha256_line(line: str) -> tuple[str, str]:
    parts = line.split(maxsplit=1)
    assert len(parts) == 2, f"Invalid SHA256 line: {line!r}"

    expected_hash, filename = parts
    assert len(expected_hash) == 64, f"Invalid SHA256 digest length: {line!r}"
    assert all(c in "0123456789abcdefABCDEF" for c in expected_hash), (
        f"Invalid SHA256 digest characters: {line!r}"
    )
    assert filename, f"SHA256 line is missing a filename: {line!r}"

    return expected_hash.lower(), filename.strip()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


@dataclass(frozen=True)
class PostgresContainer:
    name: str
    user: str
    db: str

    def stop(self):
        subprocess.run(
            ["docker", "stop", self.name],
            capture_output=True,
            text=True,
            check=False,
        )


def start_postgres_container() -> PostgresContainer:
    container = PostgresContainer(
        name=f"otr-public-import-e2e-{uuid.uuid4().hex}",
        user=postgres_user(),
        db=postgres_db(),
    )
    run_checked(
        [
            "docker",
            "run",
            "--detach",
            "--rm",
            "--name",
            container.name,
            "--network",
            "none",
            "--env",
            f"POSTGRES_USER={container.user}",
            "--env",
            f"POSTGRES_PASSWORD={POSTGRES_PASSWORD}",
            "--env",
            f"POSTGRES_DB={container.db}",
            POSTGRES_IMAGE,
        ]
    )
    try:
        wait_for_postgres(container)
    except Exception:
        container.stop()
        raise
    return container


def wait_for_postgres(container: PostgresContainer):
    deadline = time.monotonic() + POSTGRES_STARTUP_TIMEOUT_SECONDS
    last_stdout = ""
    last_stderr = ""

    while time.monotonic() < deadline:
        proc = subprocess.run(
            [
                "docker",
                "exec",
                container.name,
                "pg_isready",
                "-U",
                container.user,
                "-d",
                container.db,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        last_stdout = proc.stdout
        last_stderr = proc.stderr
        if proc.returncode == 0:
            return
        time.sleep(1)

    raise AssertionError(
        f"Postgres container {container.name} did not become ready within "
        f"{POSTGRES_STARTUP_TIMEOUT_SECONDS}s.\n"
        f"stdout:\n{last_stdout.strip()}\n"
        f"stderr:\n{last_stderr.strip()}"
    )


def restore_archive(container: PostgresContainer, archive_path: Path):
    gzip_proc = subprocess.Popen(
        ["gzip", "-dc", str(archive_path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert gzip_proc.stdout is not None
    assert gzip_proc.stderr is not None

    psql_proc = subprocess.Popen(
        [
            "docker",
            "exec",
            "-i",
            container.name,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            container.user,
            "-d",
            container.db,
        ],
        stdin=gzip_proc.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    gzip_proc.stdout.close()

    try:
        psql_stdout, psql_stderr = psql_proc.communicate(
            timeout=IMPORT_TIMEOUT_SECONDS
        )
    except subprocess.TimeoutExpired as exc:
        psql_proc.kill()
        gzip_proc.kill()
        psql_stdout, psql_stderr = psql_proc.communicate()
        gzip_stderr = gzip_proc.stderr.read()
        raise AssertionError(
            f"Import exceeded timeout of {IMPORT_TIMEOUT_SECONDS}s.\n"
            f"psql stdout:\n{tail(psql_stdout)}\n"
            f"psql stderr:\n{tail(psql_stderr)}\n"
            f"gzip stderr:\n{tail(gzip_stderr)}"
        ) from exc

    gzip_stderr = gzip_proc.stderr.read()
    try:
        gzip_returncode = gzip_proc.wait(timeout=30)
    except subprocess.TimeoutExpired as exc:
        gzip_proc.kill()
        gzip_stderr += gzip_proc.stderr.read()
        raise AssertionError(
            "gzip did not exit after psql completed.\n"
            f"psql stdout:\n{tail(psql_stdout)}\n"
            f"psql stderr:\n{tail(psql_stderr)}\n"
            f"gzip stderr:\n{tail(gzip_stderr)}"
        ) from exc

    assert gzip_returncode == 0, (
        "gzip failed while decompressing the public archive.\n"
        f"psql stdout:\n{tail(psql_stdout)}\n"
        f"psql stderr:\n{tail(psql_stderr)}\n"
        f"gzip stderr:\n{tail(gzip_stderr)}"
    )
    assert psql_proc.returncode == 0, (
        "psql failed while importing the public archive into Postgres 17.\n"
        f"psql stdout:\n{tail(psql_stdout)}\n"
        f"psql stderr:\n{tail(psql_stderr)}"
    )


def run_checked(args: list[str]):
    proc = subprocess.run(args, capture_output=True, text=True, check=False)
    assert proc.returncode == 0, (
        f"Command failed: {' '.join(args)}\n"
        f"stdout:\n{proc.stdout.strip()}\n"
        f"stderr:\n{proc.stderr.strip()}"
    )
    return proc


def tail(output: bytes) -> str:
    return output.decode(errors="replace").strip()[-OUTPUT_LIMIT:]


def postgres_user() -> str:
    return optional_config("DB_USER") or DEFAULT_POSTGRES_USER


def postgres_db() -> str:
    return optional_config("DB_NAME") or DEFAULT_POSTGRES_DB
