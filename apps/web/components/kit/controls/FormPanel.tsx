import type * as React from 'react';

import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * A page form on one panel: FormSections divided by their header strips,
 * then FormActions. It renders the `<form>`; wrap it in shadcn's `Form`
 * provider when it uses react-hook-form. Put the page's PageHeader above it.
 */
export function FormPanel({
  className,
  panelClassName,
  children,
  ...props
}: React.ComponentProps<'form'> & {
  /** Classes for the panel around the form. */
  panelClassName?: string;
}) {
  return (
    <Panel as="div" data-slot="form-panel" className={panelClassName}>
      <form className={cn('flex flex-col', className)} {...props}>
        {children}
      </form>
    </Panel>
  );
}

/**
 * One group of fields in a FormPanel: a section header strip, then the
 * fields 16px apart. Sections after the first get a divider above.
 */
export function FormSection({
  icon,
  title,
  level = 2,
  description,
  infoText,
  actions,
  className,
  bodyClassName,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  /** Muted, never blue. */
  icon?: KitIcon;
  /** Sentence case: "Tournament details". */
  title: string;
  level?: 2 | 3 | 4;
  /** One muted line at the top of the section. */
  description?: React.ReactNode;
  /** How to fill in the section, behind an info button in the strip. */
  infoText?: React.ReactNode;
  /** Small controls for the whole section, at the right of the strip. */
  actions?: React.ReactNode;
  /** Classes for the area under the strip that holds the fields. */
  bodyClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      data-slot="form-section"
      className={cn('not-first:border-t', className)}
      {...props}
    >
      <SectionHeader
        icon={icon}
        title={title}
        level={level}
        infoText={infoText}
        actions={actions}
      />
      <div className={cn('flex flex-col gap-4 p-4', bodyClassName)}>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const GRID_COLUMNS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
} as const;

/**
 * Fields side by side inside a FormSection, one column on phones. `4` is for
 * short fields such as a rank range, and keeps two columns on phones.
 */
export function FormGrid({
  columns = 2,
  className,
  ...props
}: React.ComponentProps<'div'> & { columns?: keyof typeof GRID_COLUMNS }) {
  return (
    <div
      data-slot="form-grid"
      // items-start keeps a field's label in place when its neighbour shows an error.
      className={cn('grid items-start gap-4', GRID_COLUMNS[columns], className)}
      {...props}
    />
  );
}

/**
 * The bottom strip of a FormPanel: normal-sized buttons on the right with the
 * primary last, and an optional note on the left. Buttons stack full width
 * on phones with the primary on top.
 */
export function FormActions({
  start,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Muted text or a quiet action on the left, such as "Changes apply on the next rating run". */
  start?: React.ReactNode;
}) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        'flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      {...props}
    >
      {start ? (
        <div className="min-w-0 text-sm text-muted-foreground">{start}</div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row sm:items-center">
        {children}
      </div>
    </div>
  );
}
