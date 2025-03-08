/**
 * Formats a date into a string as follows: "2023-10-05 14:30:45 UTC"
 * @param date The date to format
 * @returns Formatted UTC date in "YYYY-MM-DD HH:MM:SS UTC" format
 */
export function formatUTCDateFull(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

/**
 * Formats a date into a string as follows: "2023-10-05"
 * @param date The date to format
 * @returns Formatted UTC date in "YYYY-MM-DD" format
 */
export function formatUTCDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
