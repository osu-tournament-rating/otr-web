import { describe, expect, mock, test, spyOn } from 'bun:test';
import type { ClientApplication } from 'discord.js';

import {
  difficultyEmojiName,
  noEmojis,
  syncEmojis,
  tierEmojiName,
} from '../emojis';
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
    expect(create).toHaveBeenCalledTimes(26);
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

test('normal startup includes verified and rejected icons', async () => {
  const { application } = fakeApplication([]);
  const emoji = await syncEmojis(application, quietLogger());
  expect(emoji('status_verified')).not.toBe('');
  expect(emoji('status_rejected')).not.toBe('');
});

test('a missing difficulty icon returns immediately and is created once in the background', async () => {
  let complete!: (value: { id: string; name: string }) => void;
  const create = mock(({ name }: { name: string }) =>
    name.startsWith('difficulty_')
      ? new Promise<{ id: string; name: string }>((resolve) => {
          complete = resolve;
        })
      : Promise.resolve({ id: '1', name })
  );
  const { application } = fakeApplication([], create);
  const emoji = await syncEmojis(application, quietLogger());
  create.mockClear();
  expect(emoji('difficulty_0_67')).toBe('');
  expect(emoji('difficulty_0_67')).toBe('');
  await Bun.sleep(0);
  expect(create).toHaveBeenCalledTimes(1);
  complete({ id: '321', name: 'difficulty_0_67' });
  await Bun.sleep(0);
  expect(emoji('difficulty_0_67')).toBe('<:difficulty_0_67:321>');
});

describe('difficultyEmojiName', () => {
  test.each([
    [0, 0, 'difficulty_0_0'],
    [0, 0.09, 'difficulty_0_0'],
    [0, 0.1, 'difficulty_0_5'],
    [0, 1.24, 'difficulty_0_10'],
    [0, 1.25, 'difficulty_0_15'],
    [0, 6.74, 'difficulty_0_65'],
    [0, 6.75, 'difficulty_0_67'],
    [0, 11, 'difficulty_0_67'],
    [5, 4.5, 'difficulty_5_45'],
    [6, 4.5, ''],
    [0, NaN, ''],
    [0, Infinity, ''],
    [0, -1, ''],
  ])('%s at %s', (mode, sr, name) =>
    expect(difficultyEmojiName(mode, sr)).toBe(name)
  );
});

test('unbounded or malformed difficulty requests cannot create emojis', async () => {
  const { application, create } = fakeApplication([]);
  const emoji = await syncEmojis(application, quietLogger(), 'statuses');
  create.mockClear();
  for (const name of [
    'difficulty_99_50',
    'difficulty_0_10000',
    'difficulty_0_13',
    'difficulty_00_5',
    'star_pill_740',
    'difficulty_0_NaN',
  ])
    expect(emoji(name)).toBe('');
  await Bun.sleep(0);
  expect(create).not.toHaveBeenCalled();
});

test('failed lazy uploads back off and preserve a truthful empty fallback', async () => {
  const clock = spyOn(Date, 'now').mockReturnValue(1000);
  try {
    const create = mock(async ({ name }: { name: string }) => {
      if (name.startsWith('difficulty_')) throw new Error('offline');
      return { name, id: '1' };
    });
    const { application } = fakeApplication([], create);
    const emoji = await syncEmojis(application, quietLogger(), 'statuses');
    create.mockClear();
    expect(emoji('difficulty_0_67')).toBe('');
    await Bun.sleep(0);
    expect(emoji('difficulty_0_67')).toBe('');
    expect(create).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(601001);
    emoji('difficulty_0_67');
    await Bun.sleep(0);
    expect(create).toHaveBeenCalledTimes(2);
  } finally {
    clock.mockRestore();
  }
});
