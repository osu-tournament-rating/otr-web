import { Ruleset, VerificationStatus } from '@otr/core/osu';
import type { Logger } from '@otr/core/logging';
import type { ClientApplication } from 'discord.js';

import {
  getStarRatingColor,
  STAR_RATING_SPECTRUM_MAX,
} from '@/lib/beatmaps/star-rating-color';
import { tierNames } from '@/lib/utils/tierData';

import {
  difficultyEmojiPng,
  statusEmojiPng,
  tierEmojiPng,
} from './views/icons';

/** Resolves an application emoji by name; empty text when the bot owns none. */
export type EmojiResolver = (name: string) => string;

export const noEmojis: EmojiResolver = () => '';

export const tierEmojiName = (tier: string, subTier: number | null) =>
  tier === 'Elite Grandmaster'
    ? 'tier_elite_grandmaster'
    : `tier_${tier.toLowerCase()}${subTier ?? 3}`;

/** A broad tier group uses sub-tier I rather than an individual rating's sub-tier. */
export const groupTierEmojiName = (tier: string) => tierEmojiName(tier, 1);

export const statusEmojiName = (status: VerificationStatus) =>
  status === VerificationStatus.Verified
    ? 'status_verified'
    : status === VerificationStatus.Rejected
      ? 'status_rejected'
      : null;

const tierEmojis = tierNames.flatMap((tier) => {
  const subTiers: (number | null)[] =
    tier === 'Elite Grandmaster' ? [null] : [1, 2, 3];
  return subTiers.map((subTier) => ({
    name: tierEmojiName(tier, subTier),
    tier: tier as string,
    subTier,
  }));
});

const DIFFICULTY_RETRY_MS = 10 * 60 * 1000;

const difficultyBucket = (sr: number) =>
  sr < 0.1
    ? 0
    : Math.min(STAR_RATING_SPECTRUM_MAX, Math.max(0.5, Math.round(sr * 2) / 2));

export const difficultyEmojiName = (ruleset: number, sr: number) =>
  Number.isInteger(ruleset) &&
  Object.values(Ruleset).includes(ruleset) &&
  Number.isFinite(sr) &&
  sr >= 0
    ? `difficulty_${ruleset}_${Math.round(difficultyBucket(sr) * 10)}`
    : '';

const difficultyForName = (name: string) => {
  const match = /^difficulty_(\d+)_(\d+)$/.exec(name);
  if (!match) return null;
  const ruleset = Number(match[1]);
  const rating = Number(match[2]) / 10;
  const canonical = difficultyEmojiName(ruleset, rating);
  return canonical === name ? { ruleset, rating } : null;
};

/** Syncs named static icons; missing bounded difficulty icons are queued without delaying replies. */
export async function syncEmojis(
  application: ClientApplication,
  logger: Logger,
  scope: 'all' | 'tiers' | 'statuses' = 'all'
): Promise<EmojiResolver> {
  const ids = new Map<string, string>();
  try {
    for (const emoji of (await application.emojis.fetch()).values()) {
      if (emoji.name) ids.set(emoji.name, emoji.id);
    }
  } catch (error) {
    logger.error('Emoji fetch failed', { error });
    return noEmojis;
  }

  const entries = [
    ...(scope === 'statuses'
      ? []
      : tierEmojis.map(({ name, tier, subTier }) => ({
          name,
          png: () => tierEmojiPng(tier, subTier),
        }))),
    ...(scope === 'tiers'
      ? []
      : [VerificationStatus.Verified, VerificationStatus.Rejected].map(
          (status) => ({
            name: statusEmojiName(status)!,
            png: () => statusEmojiPng(status),
          })
        )),
  ];
  let created = 0;
  for (const { name, png } of entries) {
    if (ids.has(name)) continue;
    try {
      const emoji = await application.emojis.create({
        name,
        attachment: Buffer.from(png()),
      });
      ids.set(name, emoji.id);
      created++;
    } catch (error) {
      logger.error('Emoji upload failed', { name, error });
    }
  }
  logger.info('Emojis ready', { total: ids.size, created });

  const pending = new Set<string>();
  const retryAfter = new Map<string, number>();
  let queue = Promise.resolve();
  return (name) => {
    const id = ids.get(name);
    if (id) return `<:${name}:${id}>`;
    const difficulty = difficultyForName(name);
    if (
      difficulty &&
      !pending.has(name) &&
      Date.now() >= (retryAfter.get(name) ?? 0)
    ) {
      pending.add(name);
      queue = queue.then(async () => {
        try {
          const emoji = await application.emojis.create({
            name,
            attachment: Buffer.from(
              difficultyEmojiPng(
                difficulty.ruleset,
                getStarRatingColor(difficulty.rating)
              )
            ),
          });
          ids.set(name, emoji.id);
          retryAfter.delete(name);
        } catch {
          retryAfter.set(name, Date.now() + DIFFICULTY_RETRY_MS);
          logger.warn('Difficulty emoji unavailable; using text', { name });
        } finally {
          pending.delete(name);
        }
      });
    }
    return '';
  };
}
