import Link from 'next/link';
import { AuditActionType } from '@otr/core/osu';
import { entityTypeToSlug } from '@/app/server/oRPC/procedures/audit/helpers';
import {
  AuditActionTypeEnumHelper,
  AuditEntityTypeEnumHelper,
} from '@/lib/enums';
import type { AuditEntry } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import AuditDiffDisplay from './AuditDiffDisplay';
import { formatRelativeTime } from './formatRelativeTime';

const actionColors: Record<AuditActionType, string> = {
  [AuditActionType.Created]:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [AuditActionType.Updated]:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [AuditActionType.Deleted]:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AuditEntryItem({
  entry,
  showEntityInfo = false,
}: {
  entry: AuditEntry;
  showEntityInfo?: boolean;
}): React.JSX.Element {
  const actionMeta = AuditActionTypeEnumHelper.getMetadata(entry.actionType);
  const entityMeta = AuditEntityTypeEnumHelper.getMetadata(entry.entityType);
  const changes = entry.changes as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  > | null;
  const slug = entityTypeToSlug(entry.entityType);

  return (
    <div
      id={`audit-${entry.id}`}
      className="border-border group relative border-l-2 py-2 pl-4"
    >
      <div className="bg-border absolute -left-[5px] top-3 h-2 w-2 rounded-full" />

      <div className="flex flex-col gap-1">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 font-medium',
              actionColors[entry.actionType]
            )}
          >
            {actionMeta.text}
          </span>
          {showEntityInfo && (
            <>
              <span className="text-muted-foreground">{entityMeta.text}</span>
              <Link
                href={`/audit/${slug}/${entry.referenceIdLock}`}
                className="text-primary hover:underline"
              >
                #{entry.referenceIdLock}
              </Link>
            </>
          )}
          <span className="text-muted-foreground">&middot;</span>
          {entry.actionUser ? (
            <Link
              href={`/players/${entry.actionUser.playerId}`}
              className="text-primary hover:underline"
            >
              {entry.actionUser.username ?? `User ${entry.actionUser.id}`}
            </Link>
          ) : (
            <span className="text-muted-foreground italic">System</span>
          )}
          <span className="text-muted-foreground">&middot;</span>
          <time
            className="text-muted-foreground"
            dateTime={entry.created}
            title={new Date(entry.created).toLocaleString()}
          >
            {formatRelativeTime(entry.created)}
          </time>
        </div>

        {/* Changes */}
        {changes && Object.keys(changes).length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {Object.entries(changes).map(([fieldName, change]) => (
              <AuditDiffDisplay
                key={fieldName}
                fieldName={fieldName}
                change={change}
                entityType={entry.entityType}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
