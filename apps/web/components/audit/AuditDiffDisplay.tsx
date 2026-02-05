import { ArrowRight } from 'lucide-react';
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
  if (value === null || value === undefined || value === 'null' || value === '') return '\u2014';

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
    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
      <span className="text-muted-foreground w-28 shrink-0 font-medium">
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-red-500/10 text-red-600 dark:text-red-400 rounded px-1.5 py-0.5 line-through">
          {oldVal}
        </span>
        <ArrowRight className="text-muted-foreground h-3 w-3 shrink-0" />
        <span className="bg-green-500/10 text-green-600 dark:text-green-400 rounded px-1.5 py-0.5">
          {newVal}
        </span>
      </span>
    </div>
  );
}
