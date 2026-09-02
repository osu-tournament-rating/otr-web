import { mkdirSync, writeFileSync } from 'node:fs';

import { createApi } from '../src/api';
import { commands } from '../src/commands';
import { parseCustomId } from '../src/custom-id';
import { env } from '../src/env';
import { finalize } from '../src/runner';

const [name, ...pairs] = process.argv.slice(2);
const values = Object.fromEntries(
  pairs.map((pair) => pair.split(/=([\s\S]*)/).slice(0, 2))
);
const usage =
  'usage: bun run preview <player|tournament|beatmap|leaderboard> key=value ... | button id=1:pt:1:0:2';

const api = createApi(env.apiUrl);
const ctx = { siteUrl: env.siteUrl };

const run = async () => {
  if (name === 'button') {
    const id = parseCustomId(values.id ?? '');
    const command = id && commands.find((c) => c.pages?.[id.view]);
    const page = id && command?.pages?.[id.view];
    if (!id || !page) {
      throw new Error(`Unknown button id: ${values.id}\n${usage}`);
    }
    return page({ id, api, ctx });
  }

  const command = commands.find((c) => c.data.name === name);
  if (!command) {
    throw new Error(usage);
  }
  const options = {
    string: (key: string) => values[key] ?? null,
    integer: (key: string) => (key in values ? Number(values[key]) : null),
  };
  return command.execute({ options, api, ctx });
};

const reply = finalize(
  await run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
);
const outDir = new URL('../.tmp/', import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const file of reply.files ?? []) {
  writeFileSync(new URL(file.name, outDir), file.data);
  console.error(`wrote .tmp/${file.name} (${file.data.byteLength} bytes)`);
}
console.log(
  JSON.stringify({ ...reply, files: reply.files?.map((f) => f.name) }, null, 2)
);
