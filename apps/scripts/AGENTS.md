# otr-scripts agent guidance

Run commands from the repository root with Python 3.14 and `uv`.

`archive`, `recovery`, and `processor` operate on configured infrastructure.
Never run them, upload archives, publish indexes, or deploy while developing.
Stop for manual intervention when a task truly requires one.

`.env` contains credentials and infrastructure paths. `lib.config` loads it at
import. Never commit or print it. Bucket names and table inclusion policy remain
in their existing constants and `lib/scripts/db.py`.

`template-db` is the development exception. Its `seed`, `create`, `drop`, and
`list` actions manage a dedicated PostgreSQL container and refuse ports `5432`
and `5433`. They can start or mutate that container; run only the action the task
needs. They never use the configured application database.

## Commands

- Setup: `uv venv --python 3.14` and `uv pip install .`. Install `'.[e2e]'` when
  pytest-based checks are required. The extra supplies pytest; installing it
  does not authorize external test execution. Build a task `.env` from
  `.env.example`; do not copy secrets.
- CLI: `uv run python src/main.py --script <operation> [options]`.
- Checks: `uv run ruff check src tests`, `uv run black --check src tests`,
  `uv run python -m compileall -q src`, and focused
  `uv run --extra e2e python -m pytest <path>` tests. Use mocked unit tests for
  operational commands; do not replace execution with test collection.
- Before database-dependent work, create a prepared database on port `5434`:
  `uv run python src/main.py --script template-db --template-action create --template-name <name> --template-web-dir <task-web-checkout>`.
  Supply an `otr-web` checkout with Bun and its dependencies installed. For a
  scripts or processor task, supply the web checkout whose schema it expects.
  Documentation-only work does not require a database.
- `uv run --extra e2e python -m pytest -m e2e tests/e2e` needs Docker and GCS
  credentials and imports a public archive into an isolated container. Run only
  for an explicitly authorized archive validation.

## Operations and code

- Public archives contain the full schema and only data from
  `public_data_table_whitelist`, publish a SHA-256 file, and refresh the HTML
  index. Dev archives mirror production data except `dev_secret_columns`, which
  are reinserted redacted. Add every new credential column to that list.
- `recovery` stops services, replaces its configured database, and replays the
  deployed image's pending migrations through the Compose `migrate` profile
  before the stack returns; a failed migration fails the run. It removes only
  older archives of the same kind. `--db-only` leaves the Compose stack running
  and drops only connections to the target database.
- `processor` runs the configured image against configured PostgreSQL and
  RabbitMQ. Do not treat it as a test command. It requires image `2026.10.09`
  or newer, because it passes `DATABASE_URL` and `RABBITMQ_AMQP_URL`.
- `template-db seed` explicitly restores an archive into `otr_template`.
  `create` fetches the supplied web checkout's `origin` default-branch revision,
  runs those migrations on the source template, clones it, and runs the task
  checkout's migrations on the clone using its installed Drizzle tool. A local
  per-user lock serializes seed and create across scripts checkouts.
  Source migration failure blocks creation; repair or explicitly reseed manually.
  Task migration failure retains the clone for inspection and returns failure.
  Existing databases are never replaced. Migrate applies pending migrations; it
  does not establish compatibility with every divergent schema or history.
  `drop` removes an instance, and `list` shows instances and sizes. Names match
  `^[a-z][a-z0-9_]{0,30}$`.
- Confirm environment, image tag, database container and name, web directory,
  bucket mapping, and RabbitMQ URL before a live operation.
- Keep CLI contracts in `src/lib/cli.py`, configuration in `src/lib/config.py`,
  and operations in `src/lib/`.
- Prefer argument lists for subprocesses. Preserve upstream failure and quote
  paths when a shell pipeline is unavoidable.
