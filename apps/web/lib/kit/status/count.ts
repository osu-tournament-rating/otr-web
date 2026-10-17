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

/**
 * The text a badge's own strings and numbers spell. Elements, such as a
 * screen-reader label (`<span className="sr-only"> unseen</span>`) or an
 * icon, add nothing; a non-finite number reads as letters, so it never
 * passes for a count.
 */
function ownText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (typeof content === 'number') {
    return Number.isFinite(content) ? String(content) : 'NaN';
  }

  if (Array.isArray(content)) {
    return content.map(ownText).join('');
  }

  return '';
}

/**
 * Whether a badge holds a count, such as `3`, `1,204` or `99+`: its own text
 * has digits and no letters, so a count followed by a screen-reader label is
 * still one. Counts take tabular figures; words keep proportional ones, which
 * keep Inter's hyphen narrow ("Pre-verified").
 */
export function isCountContent(content: unknown): boolean {
  const text = ownText(content);

  return /\d/.test(text) && !/\p{L}/u.test(text);
}
