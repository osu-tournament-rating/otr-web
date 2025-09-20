// Chart constants and utilities
export const CHART_CONSTANTS = {
  DEFAULT_HEIGHT: 250,
  DEFAULT_MARGIN: { top: 20, right: 20, left: 0, bottom: 25 },
  VERTICAL_MARGIN: { top: 20, right: 20, left: 20, bottom: 5 },
  BUCKET_SIZE: 25,
  BORDER_RADIUS: [4, 4, 0, 0] as [number, number, number, number],
} as const;

export const CHART_COLORS = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  mutedForeground: 'var(--muted-foreground)',
  background: 'var(--background)',
} as const;

export function formatChartNumber(value: number): string {
  return value.toLocaleString();
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatKilo(value: number, decimals: number = 0): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toString();
}

export function formatRating(value: number): string {
  return value.toFixed(0);
}

export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function processChartData<T extends Record<string, number>>(
  data: T,
  keyTransform?: (key: string) => string,
  sortFn?: (a: [string, number], b: [string, number]) => number
): Array<{ key: string; value: number; label: string }> {
  const entries = Object.entries(data);

  if (sortFn) {
    entries.sort(sortFn);
  }

  return entries.map(([key, value]) => ({
    key,
    value,
    label: keyTransform ? keyTransform(key) : key,
  }));
}

// Common chart tick formatters
export const TICK_FORMATTERS = {
  number: formatChartNumber,
  percentage: (value: number) => `${value}%`,
  kilo: formatKilo,
  rating: formatRating,
} as const;
