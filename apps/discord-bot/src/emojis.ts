import type { Logger } from '@otr/core/logging';
import type { ClientApplication } from 'discord.js';

import { tierNames } from '@/lib/utils/tierData';

import { tierEmojiPng } from './views/icons';

/** Resolves an application emoji by name; empty text when the bot owns none. */
export type EmojiResolver = (name: string) => string;

export const noEmojis: EmojiResolver = () => '';

export const tierEmojiName = (tier: string, subTier: number | null) =>
  tier === 'Elite Grandmaster'
    ? 'tier_elite_grandmaster'
    : `tier_${tier.toLowerCase()}${subTier ?? 3}`;

const tierEmojis = tierNames.flatMap((tier) => {
  const subTiers: (number | null)[] =
    tier === 'Elite Grandmaster' ? [null] : [1, 2, 3];
  return subTiers.map((subTier) => ({
    name: tierEmojiName(tier, subTier),
    tier: tier as string,
    subTier,
  }));
});

/** Uploads every missing tier emoji, then resolves the whole set by name. */
export async function syncEmojis(
  application: ClientApplication,
  logger: Logger
): Promise<EmojiResolver> {
  const ids = new Map<string, string>();

  try {
    for (const emoji of (await application.emojis.fetch()).values()) {
      if (emoji.name) {
        ids.set(emoji.name, emoji.id);
      }
    }
  } catch (error) {
    logger.error('Emoji fetch failed', { error });
    return noEmojis;
  }

  let created = 0;
  for (const { name, tier, subTier } of tierEmojis) {
    if (ids.has(name)) {
      continue;
    }
    try {
      const emoji = await application.emojis.create({
        name,
        attachment: Buffer.from(tierEmojiPng(tier, subTier)),
      });
      ids.set(name, emoji.id);
      created += 1;
    } catch (error) {
      logger.error('Emoji upload failed', { name, error });
    }
  }
  logger.info('Emojis ready', { total: ids.size, created });

  return (name) => {
    const id = ids.get(name);
    return id ? `<:${name}:${id}>` : '';
  };
}
