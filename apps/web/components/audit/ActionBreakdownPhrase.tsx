import { Fragment } from 'react';
import type { AuditEventActionCount } from '@/lib/orpc/schema/audit';
import { ACTION_LABELS, ACTION_TEXT_COLORS } from '@/lib/audit-actions';

const numberFormat = new Intl.NumberFormat('en-US');

/** e.g. "verified 115, rejected 3". */
export default function ActionBreakdownPhrase({
  breakdown,
}: {
  breakdown: AuditEventActionCount[];
}): React.JSX.Element {
  return (
    <>
      {breakdown.map((part, index) => (
        <Fragment key={part.action}>
          {index > 0 && ', '}
          <span className={ACTION_TEXT_COLORS[part.action]}>
            {ACTION_LABELS[part.action]}
          </span>{' '}
          {numberFormat.format(part.count)}
        </Fragment>
      ))}
    </>
  );
}
