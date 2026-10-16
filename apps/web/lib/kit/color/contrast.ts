/**
 * Colour maths for checking palettes: CSS colour parsing, WCAG 2 contrast and
 * alpha compositing. Pure, so tests and the design gallery can both use it.
 */

/** sRGB channels in 0..1, plus alpha in 0..1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

/** Text needs 4.5:1 against its surface, marks and icons 3:1 (WCAG 1.4.3, 1.4.11). */
export const CONTRAST_TEXT = 4.5;
export const CONTRAST_MARK = 3;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const trimmed = raw.trim();
  return clamp01(
    trimmed.endsWith('%') ? Number(trimmed.slice(0, -1)) / 100 : Number(trimmed)
  );
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return { r: f(0), g: f(8), b: f(4) };
}

function linearToSrgb(value: number): number {
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** OKLab to gamma-encoded sRGB, clipped into the gamut. */
export function oklabToRgb(l: number, a: number, b: number) {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp01(
      linearToSrgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)
    ),
    g: clamp01(
      linearToSrgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)
    ),
    b: clamp01(
      linearToSrgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_)
    ),
  };
}

/** Gamma-encoded sRGB to OKLab. */
export function rgbToOklab({ r, g, b }: { r: number; g: number; b: number }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  );

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function parseNumber(raw: string): number {
  const trimmed = raw.trim();
  return trimmed.endsWith('%') ? Number(trimmed.slice(0, -1)) : Number(trimmed);
}

/**
 * Parses the colour notations globals.css uses: `#rgb`, `#rrggbb`,
 * `#rrggbbaa`, `rgb()`, `hsl()`/`hsla()` and `oklch()`. Throws on anything
 * else, so a test never passes on a colour it could not read.
 */
export function parseColor(input: string): Rgba {
  const color = input.trim().toLowerCase();

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? [...hex].map((digit) => digit + digit).join('')
        : hex;

    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(full)) {
      throw new Error(`Unsupported colour: ${input}`);
    }

    return {
      r: Number.parseInt(full.slice(0, 2), 16) / 255,
      g: Number.parseInt(full.slice(2, 4), 16) / 255,
      b: Number.parseInt(full.slice(4, 6), 16) / 255,
      alpha:
        full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }

  const match = color.match(/^(rgba?|hsla?|oklch)\((.*)\)$/);
  if (!match) throw new Error(`Unsupported colour: ${input}`);

  const [, fn, body] = match;
  const [channelPart, slashAlpha] = body.split('/');
  const channels = channelPart
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const alpha = parseAlpha(slashAlpha ?? channels[3]);

  if (channels.length < 3 || channels.slice(0, 3).some((c) => c === 'none')) {
    throw new Error(`Unsupported colour: ${input}`);
  }

  if (fn.startsWith('rgb')) {
    const [r, g, b] = channels
      .slice(0, 3)
      .map((channel) =>
        channel.endsWith('%')
          ? parseNumber(channel) / 100
          : parseNumber(channel) / 255
      );
    return { r: clamp01(r), g: clamp01(g), b: clamp01(b), alpha };
  }

  if (fn.startsWith('hsl')) {
    const [hue, saturation, lightness] = channels.slice(0, 3).map(parseNumber);
    return { ...hslToRgb(hue, saturation, lightness), alpha };
  }

  // oklch(L C H): L as a 0..1 number or a percentage.
  const lightness = channels[0].endsWith('%')
    ? parseNumber(channels[0]) / 100
    : parseNumber(channels[0]);
  const chroma = parseNumber(channels[1]);
  const hue = (parseNumber(channels[2]) * Math.PI) / 180;

  return {
    ...oklabToRgb(lightness, chroma * Math.cos(hue), chroma * Math.sin(hue)),
    alpha,
  };
}

/** Paints `top` over an opaque `bottom`, as the browser does for a translucent fill. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top.alpha;
  return {
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
    alpha: 1,
  };
}

/** WCAG 2 relative luminance of an opaque colour. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/**
 * WCAG 2 contrast ratio of `foreground` on `background`, 1..21. A translucent
 * foreground is first painted over the background.
 */
export function contrastRatio(
  foreground: string | Rgba,
  background: string | Rgba
): number {
  const bottom =
    typeof background === 'string' ? parseColor(background) : background;
  const top =
    typeof foreground === 'string' ? parseColor(foreground) : foreground;
  const opaqueBottom = bottom.alpha < 1 ? { ...bottom, alpha: 1 } : bottom;
  const opaqueTop = top.alpha < 1 ? composite(top, opaqueBottom) : top;

  const [lighter, darker] = [
    relativeLuminance(opaqueTop),
    relativeLuminance(opaqueBottom),
  ].sort((left, right) => right - left);

  return (lighter + 0.05) / (darker + 0.05);
}

/** `#rrggbb` for an opaque colour. */
export function toHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(clamp01(channel) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** A ratio as the gallery prints it: `4.5:1`, rounded down so it never overstates. */
export function formatContrast(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}
