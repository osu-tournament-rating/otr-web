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
    '/$data.name sends its embed, attachments and intended navigation',
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
      if (command.data.name === 'player') {
        expect(payload.components).toEqual([
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: 'More details',
                custom_id: '1:pd:1:0:1',
              },
            ],
          },
        ]);
        expect(payload.embeds[0].url).toBe(`${ctx.siteUrl}/players/1`);
      } else {
        expect(payload.components).toEqual([]);
      }
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
