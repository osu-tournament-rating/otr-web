import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SectionErrorProps = {
  title: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
};

/**
 * Takes the place of a section whose data failed to load, so the failure
 * never reads as an empty list.
 */
export default function SectionError({
  title,
  description = 'This is temporarily unavailable. Try the request again.',
  onRetry,
  retrying = false,
  className,
}: SectionErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center',
        className
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={retrying}
        onClick={onRetry}
        className="mt-5"
      >
        <RefreshCw
          className={cn(retrying && 'animate-spin')}
          aria-hidden="true"
        />
        Try again
      </Button>
    </div>
  );
}
