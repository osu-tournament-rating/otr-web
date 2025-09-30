import { cn } from '@/lib/utils';

export const iconButtonStyle = (className?: string) =>
  cn(
    'hover:text-accent-foreground size-4 shrink-0 cursor-pointer transition-[color]',
    className
  );
