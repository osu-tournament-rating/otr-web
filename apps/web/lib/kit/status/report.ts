import { ReportStatus } from '@otr/core/osu';

export interface ReportStatusCopy {
  /** The state's one name, used on My reports and the admin queue. */
  name: string;
  /** Plain-language line read after "<name>: ", so it starts lower case. */
  summary: string;
  /** Waiting is neutral; the admin's outcome is green or red. */
  tone: 'neutral' | 'success' | 'destructive';
}

export const REPORT_STATUS_COPY: Record<ReportStatus, ReportStatusCopy> = {
  [ReportStatus.Pending]: {
    name: 'Pending',
    summary: 'waiting for an admin to review it.',
    tone: 'neutral',
  },
  [ReportStatus.Approved]: {
    name: 'Confirmed',
    summary: 'an admin agreed with the report and acted on it.',
    tone: 'success',
  },
  [ReportStatus.Rejected]: {
    name: 'Dismissed',
    summary: 'an admin reviewed it and found nothing to change.',
    tone: 'destructive',
  },
};

const UNKNOWN_REPORT_STATUS_COPY: ReportStatusCopy = {
  name: 'Unknown status',
  summary: 'this status is not recognised.',
  tone: 'neutral',
};

/** Filters and legends list report states in this order. */
export const REPORT_STATUS_ORDER: readonly ReportStatus[] = [
  ReportStatus.Pending,
  ReportStatus.Approved,
  ReportStatus.Rejected,
];

export function getReportStatusCopy(status: ReportStatus): ReportStatusCopy {
  return REPORT_STATUS_COPY[status] ?? UNKNOWN_REPORT_STATUS_COPY;
}

/** The tooltip line, such as "Dismissed: an admin reviewed it and …". */
export function getReportStatusTooltip(status: ReportStatus): string {
  const { name, summary } = getReportStatusCopy(status);
  return `${name}: ${summary}`;
}
