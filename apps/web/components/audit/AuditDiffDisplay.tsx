import { ArrowRight } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { IBitwiseEnumHelper, EnumMetadata } from '@/lib/enums';
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

function formatValue(
  value: unknown,
  entityType: AuditEntityType,
  fieldName: string,
  referencedUsers?: Record<string, ReferencedUser>
): string {
  if (value === null || value === undefined || value === 'null' || value === '')
    return '\u2014';

  // Handle user reference fields
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

  return (
    <div
      data-testid="audit-diff-row"
      className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2"
    >
      <span
        data-testid="diff-field-label"
        className="text-muted-foreground w-28 shrink-0 font-medium"
      >
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          data-testid="diff-old-value"
          className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 line-through dark:text-red-400"
        >
          {oldVal}
        </span>
        <ArrowRight className="text-muted-foreground h-3 w-3 shrink-0" />
        <span
          data-testid="diff-new-value"
          className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-600 dark:text-green-400"
        >
          {newVal}
        </span>
      </span>
    </div>
  );
}
