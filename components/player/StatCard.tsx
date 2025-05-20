import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        'flex flex-1 shrink-0 items-center gap-2 rounded-lg p-4',
        bordered ? 'border border-muted bg-muted/30' : 'bg-muted/50',
        className
      )}
    >
      {icon && (
        <div className={cn('flex items-center justify-center', iconClassName)}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
