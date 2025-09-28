import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export function SortableHeader({
  column,
  children,
}: {
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | 'asc' | 'desc';
  };
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      {children}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3" />
      )}
    </Button>
  );
}

export function NumericCell({
  value,
  format,
}: {
  value: number | undefined | null;
  format?: (value: number) => string;
}) {
  if (value === undefined || value === null) {
    return <div className="text-muted-foreground text-center">-</div>;
  }

  const formatted = format ? format(value) : value.toString();
  return <div className="text-center font-mono">{formatted}</div>;
}
