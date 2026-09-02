import type { Command } from '../command';
import { leaderboardPage } from '../views/leaderboard';
import { rulesetChoices, slash } from './slash';

export const leaderboard: Command = {
  data: slash('leaderboard', 'Show a page of the rating leaderboard')
    .addIntegerOption((option) =>
      option
        .setName('ruleset')
        .setDescription('Ruleset; defaults to osu!')
        .addChoices(...rulesetChoices)
    )
    .addStringOption((option) =>
      option
        .setName('country')
        .setDescription('Two-letter country code')
        .setMinLength(2)
        .setMaxLength(4)
    )
    .addIntegerOption((option) =>
      option.setName('page').setDescription('Page of 20 players').setMinValue(1)
    )
    .toJSON(),

  async execute({ options, api, ctx }) {
    const country = options.string('country')?.trim().toUpperCase();
    const response = await api.leaderboard.list({
      ruleset: options.integer('ruleset') ?? undefined,
      country: country || undefined,
      page: options.integer('page') ?? 1,
      pageSize: 20,
    });
    return leaderboardPage(
      response,
      {
        view: 'lb',
        key: '-',
        ruleset: response.ruleset,
        page: response.page,
        ...(country ? { country } : {}),
      },
      ctx
    );
  },

  pages: {
    lb: async ({ id, api, ctx }) =>
      leaderboardPage(
        await api.leaderboard.list({
          ruleset: id.ruleset ?? undefined,
          country: id.country,
          page: id.page,
          pageSize: 20,
        }),
        id,
        ctx
      ),
  },

  notFound: () => 'No rated players match.',
};
