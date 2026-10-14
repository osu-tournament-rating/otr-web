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
