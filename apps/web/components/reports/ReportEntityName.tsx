import { EntityLink } from '@/components/kit/tables/EntityLink';
import { cn } from '@/lib/utils';

import { getReportEntityHref, type ReportSummary } from './report-presentation';

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
