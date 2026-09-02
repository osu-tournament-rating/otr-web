import type { Api } from '../api';
import { ReplyError, type Command } from '../command';
import {
  beatmapCard,
  beatmapScores,
  beatmapTournaments,
} from '../views/beatmap';
import { clip } from '../views/format';
import { slash } from './slash';

const notFound = (query: string) => `No beatmap matches "${query}".`;

/** An osu! beatmap id from a bare id, an osu! link, or an o!TR link; null for free text. */
export function resolveBeatmapId(text: string): number | null {
  const value = text.trim();
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  const match =
    value.match(/\/(?:b|beatmaps)\/(\d+)/) ?? value.match(/#[a-z]+\/(\d+)/);
  return match ? Number(match[1]) : null;
}

const stats = (api: Api, osuId: number) =>
  api.beatmaps.stats({ id: osuId, keyType: 'osu' });

export const beatmap: Command = {
  data: slash('beatmap', 'Show a beatmap card')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Artist, title, difficulty, beatmap id, or link')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .toJSON(),

  async autocomplete({ value, api }) {
    const query = value.trim();
    if (!query) {
      return [];
    }
    const { items } = await api.beatmaps.list(
      { searchQuery: query, page: 1, pageSize: 25 },
      { signal: AbortSignal.timeout(2500) }
    );
    return items.map((b) => ({
      name: clip(
        `${b.artist} - ${b.title} [${b.diffName}] ★${b.sr.toFixed(2)}`,
        100
      ),
      value: String(b.osuId),
    }));
  },

  async execute({ options, api, ctx }) {
    const query = (options.string('query') ?? '').trim();
    const osuId =
      resolveBeatmapId(query) ??
      (await api.beatmaps.list({ searchQuery: query, page: 1, pageSize: 1 }))
        .items[0]?.osuId;
    if (!osuId) {
      throw new ReplyError(notFound(query));
    }
    return beatmapCard(await stats(api, osuId), ctx);
  },

  pages: {
    bo: async ({ id, api, ctx }) =>
      beatmapCard(await stats(api, Number(id.key)), ctx),
    bs: async ({ id, api, ctx }) =>
      beatmapScores(await stats(api, Number(id.key)), ctx),
    bt: async ({ id, api, ctx }) =>
      beatmapTournaments(await stats(api, Number(id.key)), id, ctx),
  },

  notFound,
};
