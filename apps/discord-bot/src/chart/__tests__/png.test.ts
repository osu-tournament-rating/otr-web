import { describe, expect, test } from 'bun:test';

import { renderPng } from '../png';
import { percentileCurve, ratingHistory } from '../svg';

const points = Array.from({ length: 12 }, (_, i) => ({
  time: Date.UTC(2025, i, 1),
  rating: 1500 + i * 17,
}));

const size = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

describe('charts', () => {
  test('ratingHistory draws one path, the dots, and a labelled peak line', () => {
    const svg = ratingHistory(points, { color: '#af57db', peak: 1701 })!;
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('peak 1,701');
    expect(svg.match(/<circle /g)).toHaveLength(12);
    expect(svg).toContain('Jan 2025');
  });

  test('fewer than two points is no chart', () => {
    expect(ratingHistory(points.slice(0, 1), { color: '#fff' })).toBeNull();
    expect(percentileCurve([], { color: '#fff' })).toBeNull();
  });

  test('percentileCurve draws one path over a filled area', () => {
    const svg = percentileCurve(
      [
        { percentile: 0, score: 100 },
        { percentile: 50, score: 500 },
        { percentile: 100, score: 900 },
      ],
      { color: '#5a8ff0' }
    )!;
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('<polygon');
    expect(svg).toContain('100%');
  });

  test('renderPng yields a PNG of the requested size', () => {
    const png = renderPng(
      ratingHistory(points, { color: '#af57db', peak: 1701 })!
    );
    expect([...png.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(size(png)).toEqual({ width: 1350, height: 450 });
    expect(
      size(
        renderPng(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"/>',
          64
        )
      )
    ).toEqual({ width: 64, height: 128 });
  });
});
