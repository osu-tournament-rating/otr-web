import { AuditEntityType } from '@otr/core/osu';
import type { IBitwiseEnumHelper, EnumMetadata } from '@/lib/enums';
import {
  getFieldLabel,
  getFieldEnumHelper,
  isFieldBitwise,
} from './auditFieldConfig';

type ChangeValue = {
  originalValue: unknown;
  newValue: unknown;
};

function formatValue(
  value: unknown,
  entityType: AuditEntityType,
  fieldName: string
): string {
  if (value === null || value === undefined || value === 'null') return '\u2014';

  const enumHelper = getFieldEnumHelper(entityType, fieldName);
  if (enumHelper && typeof value === 'number') {
    if (isFieldBitwise(entityType, fieldName)) {
      const bitwiseHelper = enumHelper as IBitwiseEnumHelper<number, EnumMetadata>;
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
}: {
  fieldName: string;
  change: ChangeValue;
  entityType: AuditEntityType;
}): React.JSX.Element {
  const label = getFieldLabel(entityType, fieldName);
  const oldVal = formatValue(change.originalValue, entityType, fieldName);
  const newVal = formatValue(change.newValue, entityType, fieldName);

  return (
    <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:gap-1.5">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <span className="flex items-center gap-1">
        <span className="text-red-500/80 line-through">{oldVal}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="text-green-600 dark:text-green-400">{newVal}</span>
      </span>
    </div>
  );
}
