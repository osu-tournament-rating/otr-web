import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';

/** `2023-10-05 14:30:45 UTC`. */
export function formatUTCDateFull(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

/** `2023-10-05`, in UTC. */
export function formatUTCDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** `3:45`, `1:23:45`. */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return formatSecondsToMinutesSeconds(seconds);
}

/** Inverse of {@link formatDuration}. Accepts `3:45` or `1:23:45`. */
export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(:[0-5]?\d){1,2}$/.test(trimmed)) {
    return null;
  }

  return trimmed
    .split(':')
    .reduce((total, part) => total * 60 + Number(part), 0);
}
