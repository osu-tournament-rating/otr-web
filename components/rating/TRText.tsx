import { cn } from '@/lib/utils';

export default function TRText({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'align-bottom text-sm font-bold text-muted-foreground/60 italic',
        className
      )}
    >
      TR
    </span>
  );
}
