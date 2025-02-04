export const dateFormats = {
  tournaments: {
    header: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    } as Intl.DateTimeFormatOptions,
    listItem: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    } as Intl.DateTimeFormatOptions,
  },
};

export function formatDateForFilter(date: Date) {
  return date.toISOString().split('T')[0];
}