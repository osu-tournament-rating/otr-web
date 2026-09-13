import { parseArgs } from 'node:util';
import type { Ruleset } from '@otr/core/osu';
import { PLAYER_STATS_RULESETS } from '@otr/core/stats/player-stats';

import { db } from '../db';
import { consoleLogger } from '../logging/logger';
import { refreshPlayerStats } from './service';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    ruleset: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

const parseRuleset = (raw: string): Ruleset => {
  const ruleset = PLAYER_STATS_RULESETS.find(
    (candidate) => candidate === Number(raw)
  );

  if (ruleset === undefined) {
    throw new Error(
      `--ruleset must be one of ${PLAYER_STATS_RULESETS.join(', ')}`
    );
  }

  return ruleset;
};

const rulesets =
  values.ruleset === undefined
    ? PLAYER_STATS_RULESETS
    : [parseRuleset(values.ruleset)];

const now = new Date();

try {
  for (const ruleset of rulesets) {
    const result = await refreshPlayerStats({
      db,
      ruleset,
      now,
      force: values.force,
      logger: consoleLogger,
    });

    console.log(JSON.stringify({ ruleset, ...result }));
  }
} finally {
  await db.$client.end();
}
