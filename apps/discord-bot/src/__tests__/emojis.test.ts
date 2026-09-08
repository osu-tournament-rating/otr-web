import { describe, expect, mock, test, spyOn } from 'bun:test';
import type { ClientApplication } from 'discord.js';

import {
  difficultyEmojiName,
  noEmojis,
  syncEmojis,
  tierEmojiName,
  groupTierEmojiName,
} from '../emojis';
import { difficultyEmojiPng } from '../views/icons';
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
    expect(create).toHaveBeenCalledTimes(26 + 4 * 19);
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

test('normal startup uploads every difficulty icon for every beatmap ruleset', async () => {
  const { application, create } = fakeApplication([]);
  const emoji = await syncEmojis(application, quietLogger());
  const uploaded = create.mock.calls
    .map(([{ name }]) => name)
    .filter((name) => name.startsWith('difficulty_'));
  expect(uploaded).toHaveLength(4 * 19);
  expect(new Set(uploaded).size).toBe(uploaded.length);
  create.mockClear();
  for (const ruleset of [0, 1, 2, 3])
    for (const sr of [0, 0.5, 4.5, 8.75, 12])
      expect(emoji(difficultyEmojiName(ruleset, sr))).toMatch(
        /^<:difficulty_\d_\d+:\d+>$/
      );
  await Bun.sleep(0);
  expect(create).not.toHaveBeenCalled();
});

test('a difficulty icon that failed at startup is recreated lazily on first use', async () => {
  let failOnce = true;
  const create = mock(async ({ name }: { name: string }) => {
    if (name === 'difficulty_1_45' && failOnce) {
      failOnce = false;
      throw new Error('rate limited');
    }
    return { id: '777', name };
  });
  const { application } = fakeApplication([], create);
  const emoji = await syncEmojis(application, quietLogger());
  create.mockClear();
  expect(emoji('difficulty_1_45')).toBe('');
  await Bun.sleep(0);
  expect(create).toHaveBeenCalledTimes(1);
  expect(emoji('difficulty_1_45')).toBe('<:difficulty_1_45:777>');
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
  const emoji = await syncEmojis(application, quietLogger(), 'statuses');
  create.mockClear();
  expect(emoji('difficulty_0_90')).toBe('');
  expect(emoji('difficulty_0_90')).toBe('');
  await Bun.sleep(0);
  expect(create).toHaveBeenCalledTimes(1);
  complete({ id: '321', name: 'difficulty_0_90' });
  await Bun.sleep(0);
  expect(emoji('difficulty_0_90')).toBe('<:difficulty_0_90:321>');
});

describe('difficultyEmojiName', () => {
  test.each([
    [0, 0, 'difficulty_0_0'],
    [0, 0.09, 'difficulty_0_0'],
    [0, 0.1, 'difficulty_0_5'],
    [0, 1.24, 'difficulty_0_10'],
    [0, 1.25, 'difficulty_0_15'],
    [0, 6.74, 'difficulty_0_65'],
    [0, 6.75, 'difficulty_0_70'],
    [0, 7.5, 'difficulty_0_75'],
    [0, 8.74, 'difficulty_0_85'],
    [0, 8.75, 'difficulty_0_90'],
    [0, 9, 'difficulty_0_90'],
    [0, 12, 'difficulty_0_90'],
    [0, 11, 'difficulty_0_90'],
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
    'difficulty_0_95',
    'difficulty_0_120',
    'difficulty_0_67',
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
    expect(emoji('difficulty_0_90')).toBe('');
    await Bun.sleep(0);
    expect(emoji('difficulty_0_90')).toBe('');
    expect(create).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(601001);
    emoji('difficulty_0_90');
    await Bun.sleep(0);
    expect(create).toHaveBeenCalledTimes(2);
  } finally {
    clock.mockRestore();
  }
});

test('broad tier representatives use I without changing individual sub-tiers', () => {
  for (const tier of [
    'Bronze',
    'Silver',
    'Gold',
    'Platinum',
    'Emerald',
    'Diamond',
    'Master',
    'Grandmaster',
  ]) {
    expect(groupTierEmojiName(tier)).toBe(`tier_${tier.toLowerCase()}1`);
    for (const subTier of [1, 2, 3])
      expect(tierEmojiName(tier, subTier)).toBe(
        `tier_${tier.toLowerCase()}${subTier}`
      );
  }
  expect(groupTierEmojiName('Elite Grandmaster')).toBe(
    'tier_elite_grandmaster'
  );
  expect(tierEmojiName('Elite Grandmaster', null)).toBe(
    'tier_elite_grandmaster'
  );
});

test.each([0, 1, 2, 3, 4, 5])(
  'high-difficulty uploads retain a visible tint for ruleset %s',
  async (ruleset) => {
    const create = mock(
      async ({ name }: { name: string; attachment?: Buffer }) => ({
        id: '321',
        name,
      })
    );
    const { application } = fakeApplication([], create);
    const emoji = await syncEmojis(application, quietLogger(), 'statuses');
    create.mockClear();
    const name = difficultyEmojiName(ruleset, 8.75);
    expect(name).toBe(`difficulty_${ruleset}_90`);
    emoji(name);
    await Bun.sleep(0);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].attachment).toEqual(
      Buffer.from(difficultyEmojiPng(ruleset, '#6563DE'))
    );
  }
);
