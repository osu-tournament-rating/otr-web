import { readFileSync } from 'node:fs';

import { renderPng } from '../chart/png';

const publicDir = new URL('../../../web/public/', import.meta.url);
const cache = new Map<string, Uint8Array>();

const rasterize = (file: string) => {
  let png = cache.get(file);
  if (!png) {
    png = renderPng(readFileSync(new URL(file, publicDir), 'utf8'), 64);
    cache.set(file, png);
  }
  return png;
};

export const tierIcon = (tier: string, subTier: number | null) =>
  rasterize(
    tier === 'Elite Grandmaster'
      ? 'icons/tiers/Elite Grandmaster.svg'
      : `icons/tiers/${tier}${subTier ?? 3}.svg`
  );

export const logo = () => rasterize('logos/small.svg');
