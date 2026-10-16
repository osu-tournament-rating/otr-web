import { ReportEntityType } from '@otr/core/osu';

import { ReportEntityTypeEnumHelper } from '@/lib/enum-helpers';
import {
  FIELD_NAMES,
  type FieldKey,
  fieldLabel,
  humanizeFieldName,
} from '@/lib/kit/format/fields';
import { formatId } from '@/lib/kit/format/number';
import type { MyReport, Report } from '@/lib/orpc/schema/report';

/** The fields My reports and the admin queue both show for a report. */
export type ReportSummary = Pick<
  Report,
  | 'id'
  | 'entityType'
  | 'entityId'
  | 'entityDisplayName'
  | 'matchId'
  | 'reason'
  | 'additionalInformation'
  | 'suggestedChanges'
  | 'status'
  | 'adminNote'
  | 'created'
  | 'resolvedAt'
> &
  Partial<Pick<MyReport, 'hasUnreadUpdate'>>;

/** "Tournament", "Match", "Game" or "Score". */
export function getReportEntityTypeName(entityType: ReportEntityType): string {
  return ReportEntityTypeEnumHelper.getMetadata(entityType).text;
}

/** "Score #4153861": the reported entity's type and ID, as the admin queue writes it. */
export function formatReportEntityRef(
  report: Pick<ReportSummary, 'entityType' | 'entityId'>
): string {
  return `${getReportEntityTypeName(report.entityType)} #${formatId(report.entityId)}`;
}

/** "report #1204", for the View button's accessible name. */
export function formatReportSubject(report: Pick<ReportSummary, 'id'>): string {
  return `report #${formatId(report.id)}`;
}

/**
 * Where the reported entity lives. Games and scores open on their match
 * page, so without the match there is nowhere to go and this returns null.
 */
export function getReportEntityHref(
  report: Pick<ReportSummary, 'entityType' | 'entityId' | 'matchId'>
): string | null {
  switch (report.entityType) {
    case ReportEntityType.Tournament:
      return `/tournaments/${report.entityId}`;
    case ReportEntityType.Match:
      return `/matches/${report.entityId}`;
    case ReportEntityType.Game:
      return report.matchId
        ? `/matches/${report.matchId}?gameId=${report.entityId}`
        : null;
    case ReportEntityType.Score:
      return report.matchId
        ? `/matches/${report.matchId}?scoreId=${report.entityId}`
        : null;
    default:
      return null;
  }
}

/**
 * The details a report filed before report reasons existed: suggested
 * changes keyed by field. A migrated report whose only entry repeats its
 * reason has none.
 */
export function getLegacySuggestedChanges(
  report: Pick<ReportSummary, 'reason' | 'suggestedChanges'>
): Record<string, string> {
  const changes = (report.suggestedChanges ?? {}) as Record<string, string>;
  const entries = Object.entries(changes);

  if (
    entries.length === 1 &&
    entries[0]?.[0] === 'reason' &&
    entries[0][1] === report.reason.label
  ) {
    return {};
  }

  return changes;
}

/** A legacy suggested change's field, by the glossary's name when it has one. */
export function getSuggestedChangeLabel(field: string): string {
  return field in FIELD_NAMES
    ? fieldLabel(field as FieldKey)
    : humanizeFieldName(field);
}
