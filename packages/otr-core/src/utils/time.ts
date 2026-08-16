/** Seconds as `mm:ss`; an hour or more keeps counting minutes, as in `61:03`. */
export function formatSecondsToMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
