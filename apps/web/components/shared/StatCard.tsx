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
        'bg-popover flex w-full flex-row items-center justify-start gap-3 rounded-lg border-none !p-4',
        className
      )}
    >
      {icon && <div className="text-primary flex-shrink-0">{icon}</div>}

      <div className="flex min-w-0 flex-col">
        <div className="text-muted-foreground text-sm">{label}</div>
        <div className={cn('text-lg font-semibold', valueClassName)}>
          {value}
        </div>
      </div>
    </Card>
  );
}
