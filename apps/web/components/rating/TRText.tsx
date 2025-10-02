import { cn } from '@/lib/utils';

export default function TRText({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-muted-foreground align-baseline font-mono text-xs font-bold',
        className
      )}
    >
      TR
    </span>
  );
}
