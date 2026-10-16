import { formatCount } from '@/lib/kit/format/number';

/**
 * A count for a badge: thousands separators, capped so the badge stays
 * small ("99+"). Negative or missing counts read as 0.
 */
export function formatBadgeCount(count: number, max = 99): string {
  if (!Number.isFinite(count) || count <= 0) {
    return '0';
  }

  const whole = Math.floor(count);

  if (whole > max) {
    return `${formatCount(max)}+`;
  }

  return formatCount(whole);
}
