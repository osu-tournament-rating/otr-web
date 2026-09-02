export type RatingPoint = { time: number; rating: number };
export type PercentilePoint = { percentile: number; score: number };

type Size = { width?: number; height?: number };

const text = 'font-family="Inter" font-size="22" fill="#9AA0A6"';
const grid = 'stroke="#9AA0A6" stroke-opacity="0.35" stroke-width="1"';
const pad = { top: 40, right: 40, bottom: 60, left: 110 };

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});
const numbers = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

const scale = (
  [domainMin, domainMax]: [number, number],
  [rangeMin, rangeMax]: [number, number]
) => {
  const span = domainMax - domainMin || 1;
  return (value: number) =>
    rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
};

const steps = (min: number, max: number, count: number) =>
  Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);

const round = (value: number) => Math.round(value * 10) / 10;

const frame = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

/** Rating over time with a dashed peak line; null below two points. */
export function ratingHistory(
  points: RatingPoint[],
  {
    color,
    peak,
    width = 1350,
    height = 450,
  }: Size & { color: string; peak?: number | null }
): string | null {
  if (points.length < 2) {
    return null;
  }

  const ratings = points.map((p) => p.rating).concat(peak ? [peak] : []);
  const yMin = Math.floor((Math.min(...ratings) - 50) / 100) * 100;
  const yMax = Math.ceil((Math.max(...ratings) + 50) / 100) * 100;
  const x = scale(
    [points[0].time, points[points.length - 1].time],
    [pad.left, width - pad.right]
  );
  const y = scale([yMin, yMax], [height - pad.bottom, pad.top]);

  const gridLines = steps(yMin, yMax, 4)
    .map(
      (value) =>
        `<line x1="${pad.left}" x2="${width - pad.right}" y1="${round(y(value))}" y2="${round(y(value))}" ${grid}/>` +
        `<text x="${pad.left - 14}" y="${round(y(value) + 8)}" text-anchor="end" ${text}>${numbers.format(value)}</text>`
    )
    .join('');
  const xLabels = steps(points[0].time, points[points.length - 1].time, 4)
    .map(
      (time) =>
        `<text x="${round(x(time))}" y="${height - pad.bottom + 34}" text-anchor="middle" ${text}>${monthYear.format(time)}</text>`
    )
    .join('');
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${round(x(p.time))} ${round(y(p.rating))}`
    )
    .join(' ');
  const dots =
    points.length <= 80
      ? points
          .map(
            (p) =>
              `<circle cx="${round(x(p.time))}" cy="${round(y(p.rating))}" r="4" fill="${color}"/>`
          )
          .join('')
      : '';
  const peakLine = peak
    ? `<line x1="${pad.left}" x2="${width - pad.right}" y1="${round(y(peak))}" y2="${round(y(peak))}" stroke="${color}" stroke-width="2" stroke-dasharray="8 8" stroke-opacity="0.7"/>` +
      `<text x="${width - pad.right}" y="${round(y(peak) - 10)}" text-anchor="end" ${text}>peak ${numbers.format(Math.round(peak))}</text>`
    : '';

  return frame(
    width,
    height,
    `${gridLines}${xLabels}${peakLine}<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>${dots}`
  );
}

/** Score against percentile, 0 to 100 on the x axis; null without points. */
export function percentileCurve(
  points: PercentilePoint[],
  { color, width = 1350, height = 450 }: Size & { color: string }
): string | null {
  if (points.length < 2) {
    return null;
  }

  const sorted = [...points].sort((a, b) => a.percentile - b.percentile);
  const yMax = Math.max(...sorted.map((p) => p.score), 1);
  const x = scale([0, 100], [pad.left, width - pad.right]);
  const y = scale([0, yMax], [height - pad.bottom, pad.top]);

  const gridLines = steps(0, yMax, 4)
    .map(
      (value) =>
        `<line x1="${pad.left}" x2="${width - pad.right}" y1="${round(y(value))}" y2="${round(y(value))}" ${grid}/>` +
        `<text x="${pad.left - 14}" y="${round(y(value) + 8)}" text-anchor="end" ${text}>${compact.format(value)}</text>`
    )
    .join('');
  const xLabels = steps(0, 100, 4)
    .map(
      (value) =>
        `<text x="${round(x(value))}" y="${height - pad.bottom + 34}" text-anchor="middle" ${text}>${value}%</text>`
    )
    .join('');
  const line = sorted
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${round(x(p.percentile))} ${round(y(p.score))}`
    )
    .join(' ');
  const area = `${sorted.map((p) => `${round(x(p.percentile))},${round(y(p.score))}`).join(' ')} ${round(x(sorted[sorted.length - 1].percentile))},${round(y(0))} ${round(x(sorted[0].percentile))},${round(y(0))}`;

  return frame(
    width,
    height,
    `${gridLines}${xLabels}<polygon points="${area}" fill="${color}" fill-opacity="0.15"/><path d="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`
  );
}
