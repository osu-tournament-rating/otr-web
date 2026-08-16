import { cn } from '@/lib/utils';

export const iconButtonStyle = (className?: string) =>
  cn(
    'size-4 shrink-0 cursor-pointer transition-colors hover:text-accent-foreground',
    className
  );
