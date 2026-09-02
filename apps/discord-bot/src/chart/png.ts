import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const fontPath = fileURLToPath(
  new URL('../../assets/Inter-Regular.ttf', import.meta.url)
);

/** Rasterizes an SVG string; `width` scales the output, otherwise the SVG size is kept. */
export function renderPng(svg: string, width?: number): Uint8Array {
  return new Resvg(svg, {
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
    },
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
  })
    .render()
    .asPng();
}
