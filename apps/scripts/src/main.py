import logging
import sys
from collections.abc import Callable
from functools import partial

from lib import cli, logs, processor, public_html
from lib.constants import scripts
from lib.scripts import db, template_db

args = cli.init()

logs.init()
logger = logging.getLogger(__name__)


def main():
    script_map: dict[str, Callable] = {
        scripts.ARCHIVE: partial(db.archive, args),
        scripts.PROCESSOR: processor.run,
        scripts.RECOVERY: partial(db.recovery, args),
        scripts.REFRESH_INDEX: public_html.generate_index,
        scripts.TEMPLATE_DB: partial(template_db.run, args),
    }

    for script in args.scripts:
        with logs.script_log(args.log_dir, script) as log_path:
            logger.info(f"Running '{script}', logging to {log_path}")
            logger.info(f"Resolved args: {args}")

            if script_map[script]() is False:
                logger.error(f"'{script}' failed")
                sys.exit(1)


if __name__ == "__main__":
    main()
