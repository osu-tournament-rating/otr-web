import type { Api } from '../api';
import type { Command } from '../command';
import type { CustomId } from '../custom-id';
import { playerBeatmaps, playerCard, playerTournaments } from '../views/player';
import { resolvePlayerKey } from './player-key';
import { rulesetChoices, slash } from './slash';

const stats = (api: Api, id: CustomId) =>
  api.players.stats({
    id: Number(id.key),
    keyType: 'otr',
    ruleset: id.ruleset ?? undefined,
  });

export const player: Command = {
  data: slash('player', 'Show a player card')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Exact osu! username, osu! id, or profile link')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addIntegerOption((option) =>
      option
        .setName('ruleset')
        .setDescription('Ruleset; defaults to the player’s main ruleset')
        .addChoices(...rulesetChoices)
    )
    .toJSON(),

  async execute({ options, api, ctx }) {
    const ruleset = options.integer('ruleset');
    const response = await api.players.stats({
      ...resolvePlayerKey(options.string('name') ?? ''),
      ruleset: ruleset ?? undefined,
    });
    return playerCard(response, ctx);
  },

  pages: {
    po: async ({ id, api, ctx }) => playerCard(await stats(api, id), ctx),
    pt: async ({ id, api, ctx }) => {
      const [response, tournaments] = await Promise.all([
        stats(api, id),
        api.players.tournaments({
          id: Number(id.key),
          keyType: 'otr',
          ruleset: id.ruleset ?? undefined,
        }),
      ]);
      return playerTournaments(response, tournaments, id, ctx);
    },
    pb: async ({ id, api, ctx }) => {
      const beatmaps = (page: number) =>
        api.players.beatmaps({
          id: Number(id.key),
          keyType: 'otr',
          limit: 5,
          offset: (page - 1) * 5,
        });
      const [response, first] = await Promise.all([
        stats(api, id),
        beatmaps(id.page),
      ]);
      const page = Math.min(
        id.page,
        Math.max(1, Math.ceil(first.totalCount / 5))
      );
      const current = page === id.page ? first : await beatmaps(page);
      return playerBeatmaps(response, current, { ...id, page }, ctx);
    },
  },

  notFound: (query) =>
    `No o!TR player matches "${query}". Type the exact osu! username, an osu! id, or a profile link.`,
};
