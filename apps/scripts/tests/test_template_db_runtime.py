"""Opt-in migration checks on small, disposable databases in the template container.

Run with OTR_TEMPLATE_RUNTIME_TEST=1. Never reads or migrates otr_template.
"""

import json
import os
import subprocess
import uuid
from contextlib import contextmanager
from pathlib import Path

import pytest

from lib.scripts import template_db

pytestmark = pytest.mark.skipif(
    os.environ.get("OTR_TEMPLATE_RUNTIME_TEST") != "1",
    reason="requires explicitly enabled local template-container runtime checks",
)


def test_real_migrations_clone_and_repeat(tmp_path, monkeypatch):
    web = Path(os.environ["OTR_TEST_WEB_DIR"]).resolve()
    assert (web / "node_modules/drizzle-kit/bin.cjs").is_file()
    inspected = subprocess.run(
        ["docker", "inspect", "otr-template-db"],
        check=True,
        capture_output=True,
        text=True,
    )
    container = json.loads(inspected.stdout)[0]
    assert container["NetworkSettings"]["Ports"]["5432/tcp"] == [
        {"HostIp": "127.0.0.1", "HostPort": "5434"}
    ]
    environment = dict(
        item.split("=", 1) for item in container["Config"]["Env"] if "=" in item
    )
    monkeypatch.setattr(template_db.config, "template_db_container", "otr-template-db")
    monkeypatch.setattr(
        template_db.config, "template_db_user", environment["POSTGRES_USER"]
    )
    monkeypatch.setattr(
        template_db.config, "template_db_password", environment["POSTGRES_PASSWORD"]
    )
    monkeypatch.setattr(template_db.config, "template_db_port", 5434)
    prefix = "prep_" + uuid.uuid4().hex[:10]
    source_name, first, second, failed = [
        prefix + suffix for suffix in ("_src", "_one", "_two", "_bad")
    ]
    monkeypatch.setattr(template_db, "TEMPLATE", source_name)
    source = tmp_path / "source"
    task = tmp_path / "task"
    task.mkdir()
    (task / "node_modules").symlink_to(web / "node_modules", target_is_directory=True)

    def write_migrations(directory, statements):
        (directory / "meta").mkdir(parents=True, exist_ok=True)
        entries = []
        for index, sql in enumerate(statements):
            tag = f"{index:04d}_test"
            (directory / f"{tag}.sql").write_text(sql)
            entries.append(
                {
                    "idx": index,
                    "version": "7",
                    "when": 1700000000000 + index,
                    "tag": tag,
                    "breakpoints": True,
                }
            )
        (directory / "meta/_journal.json").write_text(
            json.dumps({"version": "7", "dialect": "postgresql", "entries": entries})
        )

    base = "CREATE TABLE preparation_test (id integer PRIMARY KEY);"
    write_migrations(source, [base])
    write_migrations(
        task / template_db.MIGRATIONS,
        [base, "ALTER TABLE preparation_test ADD COLUMN task_only text;"],
    )

    @contextmanager
    def migrations(_web):
        yield source

    monkeypatch.setattr(template_db, "default_migrations", migrations)

    def sql(statement, database="postgres"):
        result = template_db.run_command(template_db.psql_command(statement, database))
        assert result is not None
        return result.strip()

    try:
        sql(f"CREATE DATABASE {source_name}")
        assert template_db.create(first, task)
        assert template_db.create(second, task)
        assert (
            sql("SELECT count(*) FROM drizzle.__drizzle_migrations", source_name) == "1"
        )
        for name in (first, second):
            assert sql("SELECT count(*) FROM drizzle.__drizzle_migrations", name) == "2"
            assert (
                sql(
                    "SELECT count(*) FROM information_schema.columns WHERE table_name='preparation_test' AND column_name='task_only'",
                    name,
                )
                == "1"
            )
        assert not template_db.create(first, task)
        assert sql("SELECT count(*) FROM drizzle.__drizzle_migrations", first) == "2"
        write_migrations(source, [base, "THIS IS INVALID SQL;"])
        assert not template_db.create(failed, task)
        assert not template_db.database_exists(failed)
    finally:
        for name in (failed, second, first, source_name):
            sql(f"DROP DATABASE IF EXISTS {name} WITH (FORCE)")
