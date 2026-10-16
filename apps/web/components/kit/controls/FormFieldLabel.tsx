import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';

/**
 * A field label inside a shadcn FormItem, with the one info button for help
 * and an optional muted hint on the right, such as a unit or "Optional".
 */
export function FormFieldLabel({
  children,
  info,
  infoLabel,
  hint,
  className,
}: {
  /** Sentence case: "Forum post URL". */
  children: React.ReactNode;
  /** How to fill in the field, opened from a circled "i". */
  info?: React.ReactNode;
  /** The info button's name; defaults to "About {label}" for a text label. */
  infoLabel?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  const name =
    infoLabel ??
    (typeof children === 'string' ? `About ${children}` : 'About this field');

  return (
    <div
      data-slot="form-field-label"
      // One row height with or without the info button or hint, so fields
      // side by side in a FormGrid keep their inputs level.
      className={cn('flex min-h-5 min-w-0 items-center gap-1.5', className)}
    >
      <FormLabel className="min-w-0">{children}</FormLabel>
      {info ? (
        // `md` is the size beside 14px text; its 20px box is the row height.
        <InfoButton label={name} side="top" align="start">
          {info}
        </InfoButton>
      ) : null}
      {hint ? (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
