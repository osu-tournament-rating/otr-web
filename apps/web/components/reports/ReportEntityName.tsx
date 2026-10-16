import { EntityLink } from '@/components/kit/tables/EntityLink';
import { cn } from '@/lib/utils';

import {
  getReportEntityHref,
  getReportEntityTypeName,
  type ReportSummary,
} from './report-presentation';

/**
 * The reported entity's name in a reports row. It links to the entity on
 * its own, so the row itself never opens anything; a game or score without
 * its match has no page and stays plain text.
 */
export function ReportEntityName({
  report,
  className,
  'data-testid': testId,
}: {
  report: Pick<
    ReportSummary,
    'entityType' | 'entityId' | 'matchId' | 'entityDisplayName'
  >;
  className?: string;
  'data-testid'?: string;
}) {
  const href = getReportEntityHref(report);

  if (!href) {
    return (
      <span
        className={cn('block truncate font-medium', className)}
        title={report.entityDisplayName}
      >
        {report.entityDisplayName}
      </span>
    );
  }

  return (
    <EntityLink
      href={href}
      title={report.entityDisplayName}
      className={className}
      data-testid={testId}
    >
      {report.entityDisplayName}
    </EntityLink>
  );
}

/**
 * The Entity cell of a reports table: the entity's type in small muted text
 * over its name. A flex column, so the name's inline link adds no height to
 * its line and a row is as tall as the loading screen's two-line cell.
 */
export function ReportEntityCell({
  report,
  'data-testid': testId,
}: {
  report: Pick<
    ReportSummary,
    'entityType' | 'entityId' | 'matchId' | 'entityDisplayName'
  >;
  /** On the name's link. */
  'data-testid'?: string;
}) {
  return (
    <span className="flex min-w-0 flex-col items-start">
      <span className="max-w-full truncate text-xs text-muted-foreground">
        {getReportEntityTypeName(report.entityType)}
      </span>
      <ReportEntityName
        report={report}
        className="max-w-full"
        data-testid={testId}
      />
    </span>
  );
}
