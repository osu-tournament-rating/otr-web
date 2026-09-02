import { TournamentQuerySortType } from '@otr/core/osu';

import type { Api } from '../api';
import { ReplyError, type Command } from '../command';
import { clip } from '../views/format';
import {
  tournamentCard,
  tournamentMatches,
  tournamentPlayers,
  tournamentPool,
} from '../views/tournament';
import { slash } from './slash';

const notFound = (query: string) => `No tournament matches "${query}".`;

const search = (
  api: Api,
  query: string,
  pageSize: number,
  signal?: AbortSignal
) =>
  api.tournaments.list(
    {
      searchQuery: query,
      sort: TournamentQuerySortType.SearchQueryRelevance,
      page: 1,
      pageSize,
    },
    { signal }
  );

const year = (iso: string | null) => (iso ? ` (${iso.slice(0, 4)})` : '');

export const tournament: Command = {
  data: slash('tournament', 'Show a tournament card')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Tournament name or abbreviation')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .toJSON(),

  async autocomplete({ value, api }) {
    const query = value.trim();
    if (!query) {
      return [];
    }
    const items = await search(api, query, 25, AbortSignal.timeout(2500));
    return items.map((t) => ({
      name: clip(`${t.abbreviation} — ${t.name}${year(t.startTime)}`, 100),
      value: String(t.id),
    }));
  },

  async execute({ options, api, ctx }) {
    const query = (options.string('name') ?? '').trim();
    const id = /^\d+$/.test(query)
      ? Number(query)
      : (await search(api, query, 1))[0]?.id;
    if (!id) {
      throw new ReplyError(notFound(query));
    }
    return tournamentCard(await api.tournaments.get({ id }), ctx);
  },

  pages: {
    to: async ({ id, api, ctx }) =>
      tournamentCard(await api.tournaments.get({ id: Number(id.key) }), ctx),
    tp: async ({ id, api, ctx }) =>
      tournamentPlayers(
        await api.tournaments.get({ id: Number(id.key) }),
        id,
        ctx
      ),
    tb: async ({ id, api, ctx }) =>
      tournamentPool(
        await api.tournaments.get({ id: Number(id.key) }),
        id,
        ctx
      ),
    tm: async ({ id, api, ctx }) =>
      tournamentMatches(
        await api.tournaments.get({ id: Number(id.key) }),
        id,
        ctx
      ),
  },

  notFound,
};
