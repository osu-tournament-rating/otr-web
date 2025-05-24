import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'flex w-full flex-row items-center justify-start gap-2 rounded-lg border-none bg-popover !p-4',
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
