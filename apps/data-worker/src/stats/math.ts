const ERF_A1 = 0.254829592;
const ERF_A2 = -0.284496736;
const ERF_A3 = 1.421413741;
const ERF_A4 = -1.453152027;
const ERF_A5 = 1.061405429;
const ERF_P = 0.3275911;

const SQRT_TWO = Math.sqrt(2);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const erf = (x: number) => {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + ERF_P * absX);
  const y =
    (((((ERF_A5 * t + ERF_A4) * t + ERF_A3) * t + ERF_A2) * t + ERF_A1) * t +
      1) *
    Math.exp(-absX * absX);
  return sign * (1 - y);
};

export const standardNormalCdf = (x: number) => 0.5 * (1 + erf(x / SQRT_TWO));

export const mean = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

export const sampleStandardDeviation = (values: number[]) => {
  if (values.length <= 1) {
    return 0;
  }

  const valuesMean = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - valuesMean) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(variance);
};

export const safeAverage = (values: number[]) => mean(values);

export const boundedSqrt = (value: number) => {
  if (value <= 0) {
    return 0;
  }

  return Math.sqrt(value);
};

export const precisionRound = (value: number) =>
  Number.parseFloat(value.toFixed(6));

export const clampProbability = (value: number) => clamp(value, 0, 1);
