import type { ReportEntityType } from '@otr/core/osu/enums';

import type { ReportCreateInput, ReportReason } from '@/lib/orpc/schema/report';

import {
  getReportReason,
  SOMETHING_ELSE_REPORT_REASON,
} from './reportTemplates';

export type NormalizedReportCreateContent = {
  reasonKey: string;
  suggestedChanges: Record<string, string>;
  justification: string;
};

export const normalizeReportCreateContent = (
  input: ReportCreateInput
): NormalizedReportCreateContent => {
  if (input.reasonKey) {
    const reason = getReportReason(input.entityType, input.reasonKey);

    return {
      reasonKey: input.reasonKey,
      // Keep the reason readable to the previous admin UI during rollout or
      // rollback. New readers recognize and hide this compatibility field.
      suggestedChanges: { reason: reason?.label ?? input.reasonKey },
      justification: input.additionalInformation ?? '',
    };
  }

  return {
    reasonKey: SOMETHING_ELSE_REPORT_REASON.key,
    suggestedChanges: input.suggestedChanges ?? {},
    justification: input.justification ?? '',
  };
};

type StoredReportContent = {
  entityType: ReportEntityType;
  reasonKey: string | null;
  justification: string;
};

export type NormalizedStoredReportContent = {
  reason: ReportReason;
  additionalInformation: string | null;
};

export const normalizeStoredReportContent = (
  report: StoredReportContent
): NormalizedStoredReportContent => ({
  reason:
    getReportReason(report.entityType, report.reasonKey) ??
    SOMETHING_ELSE_REPORT_REASON,
  additionalInformation:
    report.justification.trim().length > 0 ? report.justification : null,
});
