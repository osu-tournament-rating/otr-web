import { Fragment } from 'react';
import type {
  AuditEventAction,
  AuditEventActionCount,
} from '@/lib/orpc/schema/audit';
import { ACTION_LABELS } from '@/lib/audit-actions';

export const ACTION_TEXT_COLORS: Record<AuditEventAction, string> = {
  verification: 'text-green-600 dark:text-green-400',
  pre_verification: 'text-green-600 dark:text-green-400',
  rejection: 'text-red-600 dark:text-red-400',
  pre_rejection: 'text-red-600 dark:text-red-400',
  submission: 'text-blue-600 dark:text-blue-400',
  update: 'text-blue-600 dark:text-blue-400',
  deletion: 'text-red-600 dark:text-red-400',
};

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
