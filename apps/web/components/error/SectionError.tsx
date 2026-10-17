import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/kit/controls/Button';
import { STATE_LAYOUT, STATE_TONE } from '@/lib/kit/feedback/state-layout';
import { cn } from '@/lib/utils';

type SectionErrorProps = {
  title: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
} & (
  | {
      /**
       * `regular` takes the place of a whole section; `compact` fits a chart,
       * a small panel or a dialog.
       */
      size?: 'regular' | 'compact';
      /** Regular falls back to a generic sentence; compact shows none. */
      description?: string;
    }
  | {
      /**
       * One line with Try again beside it, for a failure inside a list or a
       * form, such as a "Load more" page or an expanded row.
       */
      size: 'inline';
      description?: never;
    }
);

/**
 * Takes the place of a section whose data failed to load, so the failure
 * never reads as an empty list.
 */
export default function SectionError({
  title,
  description: descriptionProp,
  onRetry,
  retrying = false,
  className,
  size = 'regular',
}: SectionErrorProps) {
  if (size === 'inline') {
    return (
      <div
        role="alert"
        data-size="inline"
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground',
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <AlertCircle
            className="size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          {title}
        </span>
        <RetryButton size="sm" retrying={retrying} onRetry={onRetry} />
      </div>
    );
  }

  if (size === 'compact') {
    const layout = STATE_LAYOUT.compact;
    const tone = STATE_TONE.destructive;

    return (
      <div
        role="alert"
        data-size="compact"
        className={cn(layout.root, className)}
      >
        <span className={cn(layout.badge, tone.badge)}>
          <AlertCircle
            className={cn(layout.icon, tone.icon)}
            aria-hidden="true"
          />
        </span>
        <p className={layout.title}>{title}</p>
        {descriptionProp ? (
          <p className={layout.description}>{descriptionProp}</p>
        ) : null}
        <div className={layout.actions}>
          <RetryButton
            size={layout.buttonSize}
            retrying={retrying}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  const description =
    descriptionProp ??
    'This is temporarily unavailable. Try the request again.';

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
      <RetryButton
        size="default"
        retrying={retrying}
        onRetry={onRetry}
        className="mt-5"
      />
    </div>
  );
}

/** The kit's outline Button: disabled, with a spinner, while `retrying`. */
function RetryButton({
  size,
  retrying,
  onRetry,
  className,
}: {
  size: 'default' | 'sm';
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size={size}
      icon={RefreshCw}
      pending={retrying}
      onClick={onRetry}
      className={className}
    >
      Try again
    </Button>
  );
}
