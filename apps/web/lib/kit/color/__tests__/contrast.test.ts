import { describe, expect, it } from 'bun:test';

import {
  composite,
  contrastRatio,
  formatContrast,
  parseColor,
  toHex,
} from '@/lib/kit/color/contrast';
import { colorDistance } from '@/lib/kit/color/cvd';

describe('parseColor', () => {
  it('reads hex, rgb, hsl and oklch', () => {
    expect(toHex(parseColor('#fff'))).toBe('#ffffff');
    expect(toHex(parseColor('#4589F2'))).toBe('#4589f2');
    expect(toHex(parseColor('rgb(69, 137, 242)'))).toBe('#4589f2');
    expect(toHex(parseColor('hsl(0, 0%, 50%)'))).toBe('#808080');
    expect(toHex(parseColor('hsla(0, 100%, 50%, 0.5)'))).toBe('#ff0000');
    expect(toHex(parseColor('oklch(1 0 0)'))).toBe('#ffffff');
    expect(toHex(parseColor('oklch(0.98 0 0)'))).toBe('#f8f8f8');
    expect(toHex(parseColor('oklch(54.517% 0.00006 271.152)'))).toBe('#707070');
  });

  it('reads alpha', () => {
    expect(parseColor('#00000080').alpha).toBeCloseTo(0.5, 2);
    expect(parseColor('hsla(337, 100%, 60%, 0.918)').alpha).toBeCloseTo(0.918);
    expect(parseColor('oklch(0.5 0.1 200 / 25%)').alpha).toBeCloseTo(0.25);
  });

  it('refuses what it cannot read', () => {
    expect(() => parseColor('var(--primary)')).toThrow();
    expect(() => parseColor('#12345')).toThrow();
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    // Order does not matter.
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(4.48, 2);
  });

  it('paints a translucent foreground over the background first', () => {
    const half = composite(parseColor('#00000080'), parseColor('#ffffff'));
    expect(toHex(half)).toBe('#7f7f7f');
    expect(contrastRatio('#00000080', '#ffffff')).toBeCloseTo(
      contrastRatio('#7f7f7f', '#ffffff'),
      2
    );
  });
});

describe('formatContrast', () => {
  it('rounds down so a ratio never reads as passing when it does not', () => {
    expect(formatContrast(4.49)).toBe('4.4:1');
    expect(formatContrast(3)).toBe('3.0:1');
    expect(formatContrast(21)).toBe('21.0:1');
  });
});

describe('colorDistance', () => {
  it('is zero for one colour and large for black and white', () => {
    expect(colorDistance('#4589f2', '#4589f2')).toBe(0);
    expect(colorDistance('#000000', '#ffffff')).toBeCloseTo(100, 0);
  });

  it('collapses red and green for a deuteranope', () => {
    const normal = colorDistance('#d73431', '#25984d');
    const deutan = colorDistance('#d73431', '#25984d', 'deutan');
    expect(deutan).toBeLessThan(normal / 2);
  });
});
