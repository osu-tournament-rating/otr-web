import { describe, expect, test } from 'bun:test';
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js';

import { ApiError } from '../api';
import { ReplyError, type Command, type Reply } from '../command';
import {
  EXPIRED,
  GENERIC_ERROR,
  finalize,
  handleAutocomplete,
  handleButton,
  handleSlash,
  type Deps,
} from '../runner';
import { fakeApi } from './fake-api';
import {
  fakeAutocomplete,
  fakeButton,
  fakeSlash,
  sentEmbed,
} from './fake-interaction';
import { quietLogger } from './quiet-logger';

const card: Reply = {
  embeds: [
    { color: 1, title: 'Card', description: 'hello', footer: { text: 'o!TR' } },
  ],
  components: [{ type: 1, components: [] }],
};

const command = (overrides: Partial<Command> = {}): Command => ({
  data: {
    name: 'player',
    description: 'Show a player card',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'name',
        description: 'Name',
        required: true,
      },
    ],
  },
  execute: async () => card,
  pages: { pt: async () => card },
  notFound: (query) => `nothing for "${query}"`,
  ...overrides,
});

const deps = (c: Command, logger = quietLogger()): Deps => ({
  commands: [c],
  api: () => fakeApi({}),
  siteUrl: 'https://otr.example',
  emoji: () => '',
  logger,
});

describe('handleSlash', () => {
  test('defers, then edits with the finalized reply', async () => {
    const interaction = fakeSlash('player', { name: 'Stage' });
    await handleSlash(interaction, deps(command()));
    expect(interaction.deferReply).toHaveBeenCalledTimes(1);
    expect(interaction.deferReply.mock.invocationCallOrder[0]).toBeLessThan(
      interaction.editReply.mock.invocationCallOrder[0]
    );
    expect(sentEmbed(interaction).title).toBe('Card');
    expect(interaction.editReply.mock.calls[0][0].components).toEqual(
      card.components
    );
  });

  test('a ReplyError becomes a grey note with its message', async () => {
    const interaction = fakeSlash('player', { name: 'Stage' });
    await handleSlash(
      interaction,
      deps(
        command({
          execute: async () => {
            throw new ReplyError('Type a name.');
          },
        })
      )
    );
    expect(sentEmbed(interaction)).toMatchObject({
      color: 0x8c8c8c,
      description: 'Type a name.',
    });
  });

  test('NOT_FOUND becomes the command copy with the typed text', async () => {
    const interaction = fakeSlash('player', { name: 'Nobody' });
    await handleSlash(
      interaction,
      deps(
        command({
          execute: async () => {
            throw new ApiError('players.stats', 'NOT_FOUND');
          },
        })
      )
    );
    expect(sentEmbed(interaction).description).toBe('nothing for "Nobody"');
  });

  test('a long user error is clipped to the description limit', async () => {
    const interaction = fakeSlash('player', { name: 'Stage' });
    await handleSlash(
      interaction,
      deps(
        command({
          execute: async () => {
            throw new ReplyError('x'.repeat(5000));
          },
        })
      )
    );
    expect(sentEmbed(interaction).description).toHaveLength(4096);
  });

  test('a refused acknowledgement is logged and answered nowhere', async () => {
    const logger = quietLogger();
    const interaction = fakeSlash('player', { name: 'Stage' });
    interaction.deferReply.mockRejectedValue(new Error('Unknown interaction'));
    await handleSlash(interaction, deps(command(), logger));
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  test('any other error becomes the generic note and logs the command and procedure', async () => {
    const logger = quietLogger();
    const interaction = fakeSlash('player', { name: 'Stage' });
    await handleSlash(
      interaction,
      deps(
        command({
          execute: async () => {
            throw new ApiError('players.stats', 'INTERNAL_SERVER_ERROR');
          },
        }),
        logger
      )
    );
    expect(sentEmbed(interaction).description).toBe(GENERIC_ERROR);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [, context] = logger.error.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(context).toMatchObject({
      command: 'player',
      procedure: 'players.stats',
    });
    expect(JSON.stringify(context)).not.toContain('Stage');
  });
});

describe('handleAutocomplete', () => {
  test('caps the choices at 25', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      name: `t${i}`,
      value: String(i),
    }));
    const interaction = fakeAutocomplete('player', 'name', 'co');
    await handleAutocomplete(
      interaction,
      deps(command({ autocomplete: async () => many }))
    );
    expect(interaction.respond.mock.calls[0][0]).toHaveLength(25);
  });

  test('answers an empty list when the lookup throws', async () => {
    const interaction = fakeAutocomplete('player', 'name', 'co');
    await handleAutocomplete(
      interaction,
      deps(
        command({
          autocomplete: async () => {
            throw new Error('timeout');
          },
        })
      )
    );
    expect(interaction.respond).toHaveBeenCalledWith([]);
  });
});

describe('handleButton', () => {
  test('a stale version answers the expired copy ephemerally', async () => {
    const interaction = fakeButton('2:pt:1:0:2');
    await handleButton(interaction, deps(command()));
    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.deferUpdate).not.toHaveBeenCalled();
    expect(sentEmbed(interaction).description).toBe(EXPIRED);
  });

  test('the owner gets the message updated in place', async () => {
    const interaction = fakeButton('1:pt:1:0:2');
    await handleButton(interaction, deps(command()));
    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
    expect(interaction.deferReply).not.toHaveBeenCalled();
    expect(sentEmbed(interaction).title).toBe('Card');
  });

  test('another user gets an ephemeral copy', async () => {
    const interaction = fakeButton('1:pt:1:0:2', { owner: false });
    await handleButton(interaction, deps(command()));
    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.deferUpdate).not.toHaveBeenCalled();
    expect(sentEmbed(interaction).title).toBe('Card');
  });

  test('a refused update is logged and answered nowhere', async () => {
    const logger = quietLogger();
    const interaction = fakeButton('1:pt:1:0:2');
    interaction.deferUpdate.mockRejectedValue(new Error('Unknown interaction'));
    await handleButton(interaction, deps(command(), logger));
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  test('a refused acknowledgement on the expired path is logged', async () => {
    const logger = quietLogger();
    const interaction = fakeButton('2:pt:1:0:2');
    interaction.deferReply.mockRejectedValue(new Error('Unknown interaction'));
    await handleButton(interaction, deps(command(), logger));
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  test('an owner click that fails keeps the message buttons', async () => {
    const kept = [{ type: 1, components: [] }];
    const interaction = fakeButton('1:pt:1:0:2', { components: kept });
    await handleButton(
      interaction,
      deps(
        command({
          pages: {
            pt: async () => {
              throw new Error('down');
            },
          },
        })
      )
    );
    expect(sentEmbed(interaction).description).toBe(GENERIC_ERROR);
    expect(interaction.editReply.mock.calls[0][0].components).toBe(kept);
  });
});

describe('finalize', () => {
  test('clips every text to its limit with an ellipsis', () => {
    const long = (n: number) => 'x'.repeat(n);
    const one = (embed: Reply['embeds'][number]) =>
      finalize({ embeds: [embed] }).embeds[0];
    const title = one({ title: long(300) }).title;
    expect(title).toHaveLength(256);
    expect(title?.endsWith('…')).toBe(true);
    expect(one({ description: long(5000) }).description).toHaveLength(4096);
    expect(one({ author: { name: long(300) } }).author?.name).toHaveLength(256);
    expect(one({ footer: { text: long(2100) } }).footer?.text).toHaveLength(
      2048
    );
    const [field] =
      one({ fields: [{ name: long(300), value: long(1100) }] }).fields ?? [];
    expect(field.name).toHaveLength(256);
    expect(field.value).toHaveLength(1024);
  });

  test('rejects more than 6000 characters or 10 embeds', () => {
    const full = { description: 'x'.repeat(4000) };
    expect(() => finalize({ embeds: [full, full] })).toThrow('6000');
    expect(() =>
      finalize({ embeds: Array.from({ length: 11 }, () => ({ title: 'x' })) })
    ).toThrow('10');
  });
});
