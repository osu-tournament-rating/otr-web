import { ArrowRight } from 'lucide-react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';
import type { IBitwiseEnumHelper, EnumMetadata } from '@/lib/enum-helpers';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { cn } from '@/lib/utils';
import {
  getFieldLabel,
  getFieldEnumHelper,
  isFieldBitwise,
  isFieldUserReference,
} from './auditFieldConfig';

type ReferencedUser = {
  id: number;
  playerId: number | null;
  osuId: number | null;
  username: string | null;
};

type ChangeValue = {
  originalValue: unknown;
  newValue: unknown;
};

function toVerificationStatus(value: unknown): VerificationStatus | null {
  if (typeof value !== 'number') return null;
  return value in VerificationStatusEnumHelper.metadata
    ? (value as VerificationStatus)
    : null;
}

function formatValue(
  value: unknown,
  entityType: AuditEntityType,
  fieldName: string,
  referencedUsers?: Record<string, ReferencedUser>
): string {
  if (value === null || value === undefined || value === 'null' || value === '')
    return '\u2014';

  if (
    isFieldUserReference(entityType, fieldName) &&
    typeof value === 'number'
  ) {
    const user = referencedUsers?.[String(value)];
    if (user?.username) {
      return user.username;
    }
    return `Deleted user (${value})`;
  }

  const enumHelper = getFieldEnumHelper(entityType, fieldName);
  if (enumHelper && typeof value === 'number') {
    if (isFieldBitwise(entityType, fieldName)) {
      const bitwiseHelper = enumHelper as IBitwiseEnumHelper<
        number,
        EnumMetadata
      >;
      const flags = bitwiseHelper.getMetadata(value);
      return flags.map((m) => m.text).join(', ') || 'None';
    }

    const metadata = enumHelper.getMetadata(value);
    if (metadata && !Array.isArray(metadata)) return metadata.text;
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function AuditDiffDisplay({
  fieldName,
  change,
  entityType,
  referencedUsers,
}: {
  fieldName: string;
  change: ChangeValue;
  entityType: AuditEntityType;
  referencedUsers?: Record<string, ReferencedUser>;
}): React.JSX.Element {
  const label = getFieldLabel(entityType, fieldName);
  const oldVal = formatValue(
    change.originalValue,
    entityType,
    fieldName,
    referencedUsers
  );
  const newVal = formatValue(
    change.newValue,
    entityType,
    fieldName,
    referencedUsers
  );
  const isStatusField =
    getFieldEnumHelper(entityType, fieldName) === VerificationStatusEnumHelper;
  const oldStatus = isStatusField
    ? toVerificationStatus(change.originalValue)
    : null;
  const newStatus = isStatusField
    ? toVerificationStatus(change.newValue)
    : null;
  const isNeutral =
    isStatusField || isFieldUserReference(entityType, fieldName);
  const oldClass =
    oldStatus !== null
      ? 'opacity-40'
      : cn(
          'rounded px-1.5 py-0.5 line-through',
          isNeutral
            ? 'bg-muted-foreground/10 text-muted-foreground'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        );
  const newClass =
    newStatus !== null
      ? undefined
      : cn(
          'rounded px-1.5 py-0.5',
          isNeutral
            ? 'bg-muted-foreground/10 text-foreground'
            : 'bg-green-500/10 text-green-600 dark:text-green-400'
        );

  return (
    <div
      data-testid="audit-diff-row"
      className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2"
    >
      <span
        data-testid="diff-field-label"
        className="w-28 shrink-0 font-medium text-muted-foreground"
      >
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span data-testid="diff-old-value" className={oldClass}>
          {oldStatus !== null ? (
            <VerificationBadge
              verificationStatus={oldStatus}
              displayText
              minimal
              size="xsmall"
            />
          ) : (
            oldVal
          )}
        </span>
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span data-testid="diff-new-value" className={newClass}>
          {newStatus !== null ? (
            <VerificationBadge
              verificationStatus={newStatus}
              displayText
              size="xsmall"
            />
          ) : (
            newVal
          )}
        </span>
      </span>
    </div>
  );
}
