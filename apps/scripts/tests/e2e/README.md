# End-to-End Tests

These tests exercise external infrastructure and should be run explicitly.

## Public replica import

The public replica import scenario fetches the newest `.gz` object from the
configured public GCS bucket, downloads the matching `.gz.sha256` object,
verifies the SHA256 line, and imports the dump into an isolated `postgres:17`
Docker container.

Prerequisites:

- Docker daemon access
- GCS read access to `GCS_PUBLIC_BUCKET`
- Either `GCS_SA_JSON_PATH` in `.env` or Google Application Default Credentials
- `DB_USER` and `DB_NAME` in `.env` when the dump contains ownership metadata

Run from the repository root:

```bash
uv pip install '.[e2e]'
python -m pytest -m e2e tests/e2e
```

The test creates a uniquely named Docker container and removes it during
teardown. It does not use or modify the configured application database
container. When `DB_USER` or `DB_NAME` are present, it uses those values inside
the disposable container so ownership metadata from the dump can restore cleanly.
