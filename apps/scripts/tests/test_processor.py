from types import SimpleNamespace

from lib import processor

IMAGE = "stagecodes/otr-processor:test"


def record_runs(monkeypatch) -> list:
    commands = []

    def run(cmd, **kwargs):
        commands.append(cmd)
        return SimpleNamespace(returncode=0, stdout=b"")

    monkeypatch.setattr(processor.subprocess, "run", run)
    return commands


def test_run_passes_the_new_variable_names_to_the_container(monkeypatch):
    commands = record_runs(monkeypatch)

    processor.run()

    pull, run = commands
    assert pull == ["docker", "pull", IMAGE]
    assert run == [
        "docker",
        "run",
        "--network",
        "host",
        "-e",
        "DATABASE_URL=postgresql://tester:test@localhost:5432/otr_test",
        "-e",
        "RUST_LOG=info",
        "-e",
        "RABBITMQ_AMQP_URL=amqp://localhost",
        IMAGE,
    ]
    assert not any(
        arg.startswith(("CONNECTION_STRING=", "RABBITMQ_URL=")) for arg in run
    )
