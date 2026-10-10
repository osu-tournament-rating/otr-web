# otr-scripts

## Getting started

Install deps:

```
uv venv --python 3.14
uv pip install .
```

## End-to-end tests

External e2e tests live under `tests/e2e`. The public replica import scenario
downloads the latest public archive and hash from GCS, verifies the SHA256
line, and restores the dump into an isolated `postgres:17` Docker container.
The dev replica scenario seeds a disposable container with known credentials,
exports a dev archive, and fails if any secret reaches it.

```
uv pip install '.[e2e]'
python -m pytest -m e2e tests/e2e
```

Unit tests need neither Docker nor credentials:

```
python -m pytest tests -m 'not e2e'
```

## Dev replicas

Dev archives mirror production: every table and every row, audits and logs
included. Only the credential columns in `dev_secret_columns`
(`src/lib/scripts/db.py`) are redacted, keyed on the row id so `NOT NULL` and
`UNIQUE` still hold and `NULL` stays `NULL`. Everything else, including real
user records, is present, so a dev archive is production data and belongs only
on trusted infrastructure.
