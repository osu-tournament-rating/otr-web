import { describe, expect, it } from 'bun:test';

import { CALLOUT_COLORS } from '@/lib/kit/color/tokens';
import {
  CALLOUT_TONES,
  CALLOUT_TONE_CLASSES,
  CALLOUT_TONE_ICONS,
} from '@/lib/kit/feedback/callout';
import { STATE_LAYOUT, STATE_TONE } from '@/lib/kit/feedback/state-layout';

const allClasses = [
  ...Object.values(STATE_LAYOUT).flatMap((layout) =>
    Object.values(layout).filter((value) => typeof value === 'string')
  ),
  ...Object.values(STATE_TONE).flatMap((tone) => Object.values(tone)),
  ...Object.values(CALLOUT_TONE_CLASSES),
].join(' ');

describe('feedback classes', () => {
  it('follow the UI conventions', () => {
    expect(allClasses).not.toMatch(/\buppercase\b|\btracking-wide/);
    expect(allClasses).not.toMatch(/text-\[/);
    expect(allClasses).not.toMatch(
      /\b(?:text|bg|border)-(?:red|orange|amber|yellow|green|blue|slate|gray)-\d/
    );
  });

  it('keep the regular state on the section error layout', () => {
    expect(STATE_LAYOUT.regular.root).toBe(
      'flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center'
    );
    expect(STATE_LAYOUT.regular.title).toBe('text-lg font-semibold');
    expect(STATE_TONE.destructive.badge).toBe('bg-destructive/10');
  });

  it('make the compact state smaller at every step', () => {
    const { regular, compact } = STATE_LAYOUT;

    expect(compact.root).not.toContain('min-h-');
    expect(compact.badge).toContain('size-9');
    expect(regular.badge).toContain('size-12');
    expect(compact.buttonSize).toBe('sm');
  });
});

describe('callout tones', () => {
  it('cover the colour family tones', () => {
    const tones: string[] = [...CALLOUT_TONES].sort();
    expect(tones).toEqual(Object.keys(CALLOUT_COLORS).sort());
  });

  it('use each tone’s own fill, border and text tokens', () => {
    for (const tone of CALLOUT_TONES) {
      const classes = CALLOUT_TONE_CLASSES[tone].split(' ');
      const { fill, border, foreground } = CALLOUT_COLORS[tone];

      expect(classes).toContain(`bg-${fill.token.slice(2)}`);
      expect(classes).toContain(`border-${border.token.slice(2)}`);
      expect(classes).toContain(`text-${foreground.token.slice(2)}`);
    }
  });

  it('give every tone its own glyph', () => {
    const icons = CALLOUT_TONES.map((tone) => CALLOUT_TONE_ICONS[tone]);
    expect(new Set(icons).size).toBe(CALLOUT_TONES.length);
  });
});
