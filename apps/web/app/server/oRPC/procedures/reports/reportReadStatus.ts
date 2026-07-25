type ReportReadState = {
  resolvedAt: string | Date | null;
  reporterViewedAt: string | Date | null;
};

const toTime = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/**
 * Determines whether a report carries an admin update the reporter has not yet seen.
 *
 * An "update" is an admin resolution (`resolvedAt` set). It is unread until the
 * reporter opens the report (`reporterViewedAt`) at or after that resolution.
 */
export const hasUnreadAdminUpdate = (report: ReportReadState): boolean => {
  if (!report.resolvedAt) {
    return false;
  }

  if (!report.reporterViewedAt) {
    return true;
  }

  return toTime(report.resolvedAt) > toTime(report.reporterViewedAt);
};
