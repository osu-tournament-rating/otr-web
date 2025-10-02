/**
 * Formats a duration expressed in seconds into a mm:ss string.
 * Values equal to or greater than one hour will produce an mm component
 * that exceeds 59 rather than switching to an hours representation.
 * @param totalSeconds Duration in seconds
 * @returns Formatted duration string such as "3:45" or "61:03"
 */
export function formatSecondsToMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
