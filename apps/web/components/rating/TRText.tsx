import { cn } from '@/lib/utils';

export default function TRText({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'align-baseline text-xs font-bold text-muted-foreground',
        className
      )}
    >
      TR
    </span>
  );
}
