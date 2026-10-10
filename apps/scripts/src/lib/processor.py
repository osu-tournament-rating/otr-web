import logging
import subprocess

from lib.config import config

logger = logging.getLogger(__name__)


def run():
    tag = config.tag
    image = f"stagecodes/otr-processor:{tag}"

    pull_cmd = f"docker pull {image}".split()

    logger.info(f"Pulling {pull_cmd}")
    pull = subprocess.run(pull_cmd, capture_output=True, check=False)

    for line in pull.stdout.splitlines():
        logger.info(line.decode())

    conn_str = f"postgresql://{config.db_user}:{config.db_password}@localhost:{config.db_port}/{config.db_name}"
    rust_log = "info"
    rabbit = config.rabbitmq_url

    # Images 2026.10.09 and newer read DATABASE_URL and RABBITMQ_AMQP_URL. Only the
    # container's names changed: the host .env still sets RABBITMQ_URL, which
    # config.rabbitmq_url reads.
    run_cmd = f"docker run --network host -e DATABASE_URL={conn_str} -e RUST_LOG={rust_log} -e RABBITMQ_AMQP_URL={rabbit} {image}".split()

    logger.info("Running processor")
    exc = subprocess.run(
        run_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False
    )

    for line in exc.stdout.splitlines():
        logger.info(line.decode())
