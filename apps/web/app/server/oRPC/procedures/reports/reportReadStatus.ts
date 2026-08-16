type ReportReadState = {
  resolvedAt: string | Date | null;
  reporterViewedAt: string | Date | null;
};

const toTime = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/** An admin resolution the reporter has not opened since. */
export const hasUnreadAdminUpdate = (report: ReportReadState): boolean => {
  if (!report.resolvedAt) {
    return false;
  }

  if (!report.reporterViewedAt) {
    return true;
  }

  return toTime(report.resolvedAt) > toTime(report.reporterViewedAt);
};
