import { describe, expect, mock, test } from 'bun:test';
import type { ClientApplication } from 'discord.js';

import { noEmojis, syncEmojis, tierEmojiName } from '../emojis';
import { quietLogger } from './quiet-logger';

const fakeApplication = (
  owned: string[],
  create = mock(async ({ name }: { name: string }) => ({
    id: `2${name.length}`,
    name,
  }))
) => {
  const emojis = {
    fetch: async () =>
      new Map(
        owned.map((name, i) => [String(i), { id: String(100 + i), name }])
      ),
    create,
  };
  return { application: { emojis } as unknown as ClientApplication, create };
};

describe('tierEmojiName', () => {
  test.each([
    ['Bronze', 1, 'tier_bronze1'],
    ['Grandmaster', 3, 'tier_grandmaster3'],
    ['Elite Grandmaster', null, 'tier_elite_grandmaster'],
  ])('%s %s', (tier, subTier, expected) => {
    expect(tierEmojiName(tier, subTier)).toBe(expected);
  });
});

describe('syncEmojis', () => {
  test('keeps the emojis the bot owns and uploads the rest', async () => {
    const { application, create } = fakeApplication(['tier_bronze1']);
    const emoji = await syncEmojis(application, quietLogger());

    expect(emoji('tier_bronze1')).toBe('<:tier_bronze1:100>');
    expect(create).toHaveBeenCalledTimes(24);
    expect(emoji('tier_elite_grandmaster')).toBe(
      '<:tier_elite_grandmaster:222>'
    );
  });

  test('an unknown name resolves to empty text', async () => {
    const { application } = fakeApplication([]);
    const emoji = await syncEmojis(application, quietLogger());
    expect(emoji('mod_hd')).toBe('');
  });

  test('a failed upload leaves that emoji empty', async () => {
    const create = mock(async () => {
      throw new Error('rate limited');
    });
    const { application } = fakeApplication([], create);
    const emoji = await syncEmojis(application, quietLogger());
    expect(emoji('tier_bronze1')).toBe('');
  });

  test('a failed fetch resolves everything to empty text', async () => {
    const application = {
      emojis: {
        fetch: async () => {
          throw new Error('offline');
        },
      },
    } as unknown as ClientApplication;
    const emoji = await syncEmojis(application, quietLogger());
    expect(emoji('tier_bronze1')).toBe('');
  });
});

test('noEmojis resolves to empty text', () => {
  expect(noEmojis('tier_bronze1')).toBe('');
});
