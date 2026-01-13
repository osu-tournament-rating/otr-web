import { ArrowRight } from 'lucide-react';

type ChangeValue = {
  originalValue: unknown;
  newValue: unknown;
};

type Changes = Record<string, ChangeValue>;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(none)';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    if (value.length > 50) {
      return `${value.slice(0, 50)}...`;
    }
    return value || '(empty)';
  }

  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      if (str.length > 50) {
        return `${str.slice(0, 50)}...`;
      }
      return str;
    } catch {
      return '[object]';
    }
  }

  return String(value);
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default function AuditChangesDisplay({
  changes,
  maxItems = 3,
  showAll = false,
}: {
  changes: Changes | null;
  maxItems?: number;
  showAll?: boolean;
}) {
  if (!changes) {
    return null;
  }

  const entries = Object.entries(changes);
  const displayEntries = showAll ? entries : entries.slice(0, maxItems);
  const hiddenCount = entries.length - displayEntries.length;

  return (
    <div className="mt-2 space-y-1 text-sm">
      {displayEntries.map(([field, { originalValue, newValue }]) => (
        <div key={field} className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground">Changed</span>
          <span className="font-semibold">{formatFieldName(field)}</span>
          <span className="text-muted-foreground">from</span>
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-semibold text-red-700 dark:text-red-400">
            {formatValue(originalValue)}
          </span>
          <ArrowRight className="text-muted-foreground h-3 w-3" />
          <span className="rounded bg-green-500/10 px-1.5 py-0.5 font-semibold text-green-700 dark:text-green-400">
            {formatValue(newValue)}
          </span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <span className="text-muted-foreground text-xs">
          +{hiddenCount} more change{hiddenCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
