import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
  iconClassName?: string;
  bordered?: boolean;
}

export function StatCard({
  icon,
  label,
  value,
  className,
  iconClassName,
  bordered = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-1 shrink-0 flex-row items-center justify-start gap-2 rounded-lg border-none bg-popover !p-4',
        // bordered ? 'border ' : 'bg-muted/50',
        className
      )}
    >
      {icon}

      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </Card>
  );
}
