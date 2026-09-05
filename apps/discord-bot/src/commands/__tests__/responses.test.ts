import { describe, expect, test } from 'bun:test';

import { fakeApi, procedure } from '../../__tests__/fake-api';
import { fakeSlash } from '../../__tests__/fake-interaction';
import {
  beatmapStats,
  ctx,
  leaderboard,
  playerStats,
  playerTournaments,
  tournamentDetail,
} from '../../__tests__/fixtures';
import { quietLogger } from '../../__tests__/quiet-logger';
import { handleSlash } from '../../runner';
import { commands } from '..';

const api = () =>
  fakeApi({
    players: {
      stats: procedure(playerStats),
      tournaments: procedure(playerTournaments),
    },
    beatmaps: { stats: procedure(beatmapStats) },
    tournaments: { get: procedure(tournamentDetail) },
    leaderboard: { list: procedure(leaderboard) },
  });

describe('slash responses', () => {
  test.each(commands)(
    '/$data.name sends its embed and attachments without buttons',
    async (command) => {
      const interaction = fakeSlash(command.data.name, {
        name: '512',
        query: '658127',
        page: 3,
      });
      await handleSlash(interaction, {
        commands,
        api,
        siteUrl: ctx.siteUrl,
        emoji: ctx.emoji,
        logger: quietLogger(),
      });
      const payload = interaction.editReply.mock.calls[0][0];
      expect(payload.embeds).toHaveLength(1);
      expect(payload.components).toEqual([]);
      const expected = await command.execute({
        options: {
          string: (name) => interaction.options.getString(name),
          integer: (name) => interaction.options.getInteger(name),
        },
        api: api(),
        ctx,
      });
      expect(payload.embeds).toEqual(expected.embeds);
      expect(payload.files?.map((file) => file.name)).toEqual(
        (expected.files ?? []).map((file) => file.name)
      );
    }
  );
});
