import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Card chrome shared by the beatmap detail page's sections. */
export function SectionCard({
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none',
        className
      )}
      {...props}
    />
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  meta,
  className,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h2 className="truncate font-semibold">{title}</h2>
      </div>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * The 0..max axis under a row chart. The spacers match the label and value
 * columns of the rows above so the two end labels sit exactly under the track.
 */
export function ScaleFooter({
  leftSpacerClassName,
  rightSpacerClassName,
  minLabel,
  maxLabel,
}: {
  leftSpacerClassName: string;
  rightSpacerClassName: string;
  minLabel: React.ReactNode;
  maxLabel: React.ReactNode;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className={cn(leftSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </span>
      <span
        className={cn(rightSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
    </div>
  );
}

/** Small muted caption used for column and group labels. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}
