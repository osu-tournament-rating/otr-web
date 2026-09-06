import { VerificationStatus } from '@otr/core/osu';
import { readFileSync } from 'node:fs';

import { renderPng } from '../chart/png';
import { hex, statusEmojiColor } from './theme';

const publicDir = new URL('../../../web/public/', import.meta.url);
const cache = new Map<string, Uint8Array>();

const rasterize = (file: string, width = 64, scale = 1) => {
  const key = `${width}:${scale}:${file}`;
  let png = cache.get(key);
  if (!png) {
    let svg = readFileSync(new URL(file, publicDir), 'utf8');
    if (scale !== 1) {
      const viewBox = svg
        .match(/viewBox="([^"]+)"/)?.[1]
        .split(/\s+/)
        .map(Number);
      if (
        !viewBox ||
        viewBox.length !== 4 ||
        viewBox.some((value) => !Number.isFinite(value))
      ) {
        throw new Error('Tier artwork requires a numeric viewBox');
      }
      const [x, y, w, h] = viewBox;
      const cx = x + w / 2;
      const cy = y + h / 2;
      svg = svg
        .replace(
          /(<svg[^>]*>)/,
          `$1<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">`
        )
        .replace('</svg>', '</g></svg>');
    }
    png = renderPng(svg, width);
    cache.set(key, png);
  }
  return png;
};

const tierFile = (tier: string, subTier: number | null) =>
  tier === 'Elite Grandmaster'
    ? 'icons/tiers/Elite Grandmaster.svg'
    : `icons/tiers/${tier}${subTier ?? 3}.svg`;

const TIER_ARTWORK_SCALE = 0.95;

/** Center tier artwork at 95% scale without changing the emoji canvas. */
export const tierEmojiPng = (tier: string, subTier: number | null) =>
  rasterize(tierFile(tier, subTier), 128, TIER_ARTWORK_SCALE);

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
