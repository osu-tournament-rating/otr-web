import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { composite, parseColor, toHex } from '@/lib/kit/color/contrast';
import { SURFACES, TEXT_COLORS } from '@/lib/kit/color/surfaces';
import { ALL_TOKENS, TOKEN_GROUPS } from '@/lib/kit/color/tokens';

const css = readFileSync(
  join(import.meta.dir, '../../../../app/globals.css'),
  'utf8'
);

/** The custom properties declared directly in the first block whose selector matches. */
function declarations(selector: RegExp): Map<string, string> {
  const match = css.match(
    new RegExp(`(?:^|\\n)${selector.source}\\s*\\{([^}]*)\\}`)
  );
  if (!match) throw new Error(`No block for ${selector}`);

  const body = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim().replace(/\s+/g, ' '),
    ])
  );
}

const light = declarations(/:root,\s*\.theme-light/);
const dark = declarations(/\.dark/);
const inlineTheme = declarations(/@theme inline/);

describe('globals.css', () => {
  it('holds the light value of every library token', () => {
    const mismatches = ALL_TOKENS.filter(
      (color) => light.get(color.token) !== color.light
    ).map((color) => [color.token, light.get(color.token), color.light]);

    expect(mismatches).toEqual([]);
  });

  it('holds the dark value of every library token', () => {
    const mismatches = ALL_TOKENS.filter(
      (color) => dark.get(color.token) !== color.dark
    ).map((color) => [color.token, dark.get(color.token), color.dark]);

    expect(mismatches).toEqual([]);
  });

  it('registers a Tailwind colour for every token that names a utility', () => {
    const missing = TOKEN_GROUPS.flatMap((group) => group.entries)
      .filter((entry) => entry.utility)
      .filter(
        (entry) =>
          inlineTheme.get(`--color-${entry.utility}`) !==
          `var(${entry.color.token})`
      )
      .map((entry) => entry.utility);

    expect(missing).toEqual([]);
  });

  it('resolves the surfaces the palettes are checked against', () => {
    const lightCard = toHex(parseColor(light.get('--card')!));
    const lightMuted = toHex(parseColor(light.get('--muted')!));
    const darkMuted = parseColor(dark.get('--muted')!);
    const darkPanel = toHex(
      composite(
        { ...darkMuted, alpha: 0.75 },
        parseColor(dark.get('--background')!)
      )
    );

    expect(lightCard).toBe(SURFACES.light.card);
    expect(lightMuted).toBe(SURFACES.light.muted);
    expect(darkPanel).toBe(SURFACES.dark.card);
    expect(toHex(darkMuted)).toBe(SURFACES.dark.muted);

    for (const [theme, block] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      for (const surface of ['popover', 'accent'] as const) {
        expect(toHex(parseColor(block.get(`--${surface}`)!))).toBe(
          SURFACES[theme][surface]
        );
      }
    }
  });

  it('resolves the text colours the palettes are checked with', () => {
    for (const [theme, block] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      expect(toHex(parseColor(block.get('--foreground')!))).toBe(
        TEXT_COLORS[theme].foreground
      );
      expect(toHex(parseColor(block.get('--muted-foreground')!))).toBe(
        TEXT_COLORS[theme].muted
      );
    }
  });
});
