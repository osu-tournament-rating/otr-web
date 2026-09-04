import { readFileSync } from 'node:fs';

import { renderPng } from '../chart/png';

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
