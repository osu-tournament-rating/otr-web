import { createLucideIcon } from 'lucide-react';

/**
 * The Pre-rejected glyph. Lucide has no dashed circled cross, so this pairs
 * the outline of lucide's `circle-dashed-check` with the cross of
 * `circle-x`; it takes the same props as any lucide icon.
 */
export const CircleDashedX = createLucideIcon('circle-dashed-x', [
  ['path', { d: 'M10.1 2.182a10 10 0 0 1 3.8 0', key: 'dashed-x-top' }],
  ['path', { d: 'M13.9 21.818a10 10 0 0 1-3.8 0', key: 'dashed-x-bottom' }],
  [
    'path',
    { d: 'M17.609 3.721a10 10 0 0 1 2.69 2.7', key: 'dashed-x-top-right' },
  ],
  ['path', { d: 'M2.182 13.9a10 10 0 0 1 0-3.8', key: 'dashed-x-left' }],
  [
    'path',
    {
      d: 'M20.279 17.609a10 10 0 0 1-2.7 2.69',
      key: 'dashed-x-bottom-right',
    },
  ],
  ['path', { d: 'M21.818 10.1a10 10 0 0 1 0 3.8', key: 'dashed-x-right' }],
  [
    'path',
    { d: 'M3.721 6.391a10 10 0 0 1 2.7-2.69', key: 'dashed-x-top-left' },
  ],
  [
    'path',
    {
      d: 'M6.391 20.279a10 10 0 0 1-2.69-2.7',
      key: 'dashed-x-bottom-left',
    },
  ],
  ['path', { d: 'm15 9-6 6', key: 'dashed-x-stroke-1' }],
  ['path', { d: 'm9 9 6 6', key: 'dashed-x-stroke-2' }],
]);
