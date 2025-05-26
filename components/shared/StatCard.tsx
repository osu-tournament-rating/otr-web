import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'flex w-full flex-row items-center justify-start gap-3 rounded-lg border-none bg-popover !p-4',
        className
      )}
    >
      {icon && <div className="flex-shrink-0 text-primary">{icon}</div>}

      <div className="flex min-w-0 flex-col">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-semibold', valueClassName)}>{value}</p>
      </div>
    </Card>
  );
}
