import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { FormLabel } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A field label with the one info button for help and an optional muted
 * hint on the right, such as a unit or "One per line". Inside a shadcn
 * FormItem it is that field's FormLabel; outside react-hook-form, pass
 * `htmlFor` with the control's id.
 */
export function FormFieldLabel({
  children,
  info,
  infoLabel,
  hint,
  htmlFor,
  invalid = false,
  className,
}: {
  /** Sentence case: "Forum post URL". */
  children: React.ReactNode;
  /** How to fill in the field, opened from a circled "i". */
  info?: React.ReactNode;
  /** The info button's name; defaults to "About {label}" for a text label. */
  infoLabel?: string;
  hint?: React.ReactNode;
  /**
   * The id of the control this labels, for a field outside a react-hook-form
   * FormItem (a filter, a search, a field in plain state). Inside a FormItem
   * leave it out; FormLabel finds the control itself.
   */
  htmlFor?: string;
  /**
   * Turns the label red, as FormLabel does for a field with an error. Only
   * with `htmlFor`; inside a FormItem the form's own error state does it.
   */
  invalid?: boolean;
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
      {htmlFor !== undefined ? (
        <Label
          htmlFor={htmlFor}
          data-error={invalid}
          className="min-w-0 data-[error=true]:text-destructive-foreground"
        >
          {children}
        </Label>
      ) : (
        <FormLabel className="min-w-0">{children}</FormLabel>
      )}
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
