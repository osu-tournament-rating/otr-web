import { VerificationStatus } from '@otr/core/osu';
import { readFileSync } from 'node:fs';

import { renderPng } from '../chart/png';
import { hex, statusEmojiColor } from './theme';

const publicDir = new URL('../../../web/public/', import.meta.url);
const cache = new Map<string, Uint8Array>();

const rasterize = (file: string, width = 64) => {
  const key = `${width}:${file}`;
  let png = cache.get(key);
  if (!png) {
    png = renderPng(readFileSync(new URL(file, publicDir), 'utf8'), width);
    cache.set(key, png);
  }
  return png;
};

const tierFile = (tier: string, subTier: number | null) =>
  tier === 'Elite Grandmaster'
    ? 'icons/tiers/Elite Grandmaster.svg'
    : `icons/tiers/${tier}${subTier ?? 3}.svg`;

/** The tier icon at the size Discord wants for an application emoji. */
export const tierEmojiPng = (tier: string, subTier: number | null) =>
  rasterize(tierFile(tier, subTier), 128);

export const logo = () => rasterize('logos/small.svg');

/** Matches VerificationBadge's Lucide circle-check and circle-x artwork. */
export const statusEmojiPng = (status: VerificationStatus) => {
  const marks =
    status === VerificationStatus.Verified
      ? '<path d="m9 12 2 2 4-4"/>'
      : '<path d="m15 9-6 6m0-6 6 6"/>';
  return renderPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="${hex(statusEmojiColor(status))}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>${marks}</svg>`,
    128
  );
};

export const difficultyEmojiPng = (ruleset: number, color: string) => {
  const file =
    ['osu', 'taiko', 'catch', 'mania', 'mania4k', 'mania7k'][ruleset] ?? 'osu';
  const source = readFileSync(
    new URL(`icons/rulesets/${file}.svg`, publicDir),
    'utf8'
  );
  const svg = source
    .replace(/\sfill="[^"]*"/g, '')
    .replace('<svg', `<svg fill="${color}"`);
  return renderPng(svg, 128);
};
