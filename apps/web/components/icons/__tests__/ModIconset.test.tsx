import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mods } from '@otr/core/osu';

import ModIconset from '@/components/icons/ModIconset';
import { ModsEnumHelper } from '@/lib/enum-helpers';

const iconDir = join(import.meta.dir, '../../../public/icons/mods');

// These mods have no icon yet; #495 covers them.
const withoutIcons = new Set([
  Mods.Perfect,
  Mods.Cinema,
  Mods.Target,
  Mods.KeyCoop,
  Mods.ScoreV2,
]);

const singleBitMods = Object.values(Mods).filter(
  (value): value is Mods =>
    typeof value === 'number' && value !== 0 && (value & (value - 1)) === 0
);

describe('ModIconset', () => {
  it('has an icon for every single-bit mod', () => {
    const missing = singleBitMods
      .filter((mod) => !withoutIcons.has(mod))
      .map((mod) => ModsEnumHelper.metadata[mod].text)
      .filter((text) => !text || !existsSync(join(iconDir, `Mod${text}.svg`)));

    expect(missing).toEqual([]);
  });

  it('renders the FI and key mod icons', () => {
    expect(renderToStaticMarkup(<ModIconset mods={Mods.FadeIn} />)).toContain(
      'ModFI.svg'
    );
    expect(renderToStaticMarkup(<ModIconset mods={Mods.Key7} />)).toContain(
      'Mod7K.svg'
    );
  });

  it('skips mods that have no acronym', () => {
    const html = renderToStaticMarkup(
      <ModIconset mods={Mods.Hidden | Mods.Target} />
    );

    expect(html).toContain('ModHD.svg');
    expect(html).not.toContain('Mod.svg');
  });
});
