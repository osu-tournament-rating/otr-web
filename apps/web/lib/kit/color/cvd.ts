import { parseColor, rgbToOklab } from './contrast';

export type ColorVision = 'normal' | 'protan' | 'deutan';

// Machado, Oliveira and Fernandes (2009) at severity 1, on linear sRGB. The
// thresholds below are calibrated to this model (the dataviz validator's).
const MACHADO: Record<Exclude<ColorVision, 'normal'>, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

/** Adjacent categorical slots should differ by at least this under simulated CVD. */
export const CVD_SEPARATION_TARGET = 8;
/** And by at least this with full colour vision. */
export const NORMAL_SEPARATION_FLOOR = 15;

const toLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const toGamma = (value: number) =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function simulate(color: string, vision: ColorVision) {
  const { r, g, b } = parseColor(color);
  if (vision === 'normal') return { r, g, b };

  const linear = [toLinear(r), toLinear(g), toLinear(b)];
  const [sr, sg, sb] = MACHADO[vision].map((row) =>
    toGamma(
      clamp01(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2])
    )
  );
  return { r: sr, g: sg, b: sb };
}

/** OKLab distance ×100 between two colours as a reader with `vision` sees them. */
export function colorDistance(
  first: string,
  second: string,
  vision: ColorVision = 'normal'
): number {
  const a = rgbToOklab(simulate(first, vision));
  const b = rgbToOklab(simulate(second, vision));
  return 100 * Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

/** The closest neighbouring pair in `colors` for `vision`, as drawn in a stack or legend. */
export function worstAdjacentDistance(
  colors: readonly string[],
  vision: ColorVision
): number {
  let worst = Number.POSITIVE_INFINITY;
  for (let index = 1; index < colors.length; index++) {
    worst = Math.min(
      worst,
      colorDistance(colors[index - 1], colors[index], vision)
    );
  }
  return worst;
}
