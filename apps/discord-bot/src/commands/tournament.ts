import { TournamentQuerySortType, VerificationStatus } from '@otr/core/osu';

import type { TournamentListItem } from '@/lib/orpc/schema/tournament';

import type { Api } from '../api';
import { ReplyError, type Command } from '../command';
import type { CustomId } from '../custom-id';
import { clip, statusName } from '../views/format';
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

const get = (api: Api, id: CustomId) =>
  api.tournaments.get({ id: Number(id.key) });

const year = (iso: string | null) => (iso ? ` (${iso.slice(0, 4)})` : '');

const verified = (t: TournamentListItem) =>
  t.verificationStatus === VerificationStatus.Verified;

/** A verified exact abbreviation, then the first verified hit, then any exact abbreviation, then the first hit. */
const pick = (query: string, hits: TournamentListItem[]) => {
  const exact = (t: TournamentListItem) =>
    t.abbreviation.toLowerCase() === query.toLowerCase();
  return (
    hits.find((t) => verified(t) && exact(t)) ??
    hits.find(verified) ??
    hits.find(exact) ??
    hits[0]
  );
};

export const tournament: Command = {
  data: slash('tournament', 'Show a tournament card')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Tournament name or abbreviation')
        .setRequired(true)
        .setMaxLength(100)
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
      name: clip(
        `${t.abbreviation} — ${t.name}${year(t.startTime)}${verified(t) ? '' : ` · ${statusName(t.verificationStatus).toLowerCase()}`}`,
        100
      ),
      value: String(t.id),
    }));
  },

  async execute({ options, api, ctx }) {
    const query = (options.string('name') ?? '').trim();
    const id = /^\d+$/.test(query)
      ? Number(query)
      : pick(query, await search(api, query, 25))?.id;
    if (!id) {
      throw new ReplyError(notFound(query));
    }
    return tournamentCard(await api.tournaments.get({ id }), ctx);
  },

  pages: {
    to: async ({ id, api, ctx }) => tournamentCard(await get(api, id), ctx),
    tp: async ({ id, api, ctx }) =>
      tournamentPlayers(await get(api, id), id, ctx),
    tb: async ({ id, api, ctx }) => tournamentPool(await get(api, id), id, ctx),
    tm: async ({ id, api, ctx }) =>
      tournamentMatches(await get(api, id), id, ctx),
  },

  notFound,
};
