import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * The strip at the top of a panel: a small muted icon, a 16px title, an
 * optional info button, and meta or actions on the right, over a divider.
 */
export function SectionHeader({
  icon: Icon,
  title,
  level = 2,
  infoText,
  meta,
  actions,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title' | 'children'> & {
  /** Muted, never blue. Leave it out rather than reuse the page's icon. */
  icon?: KitIcon;
  title: string;
  /** Heading level; follow the page outline, never skip a level. */
  level?: 2 | 3 | 4;
  /** How to read the section, shown through an info button. */
  infoText?: React.ReactNode;
  /** Short muted text on the right, such as a count. */
  meta?: React.ReactNode;
  /** Controls for the whole section, after the meta. */
  actions?: React.ReactNode;
}) {
  const Heading = `h${level}` as const;

  return (
    <div
      data-slot="section-header"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <Heading className="truncate font-semibold">{title}</Heading>
        {infoText ? (
          <InfoButton label={`About ${title}`} side="bottom" align="start">
            {infoText}
          </InfoButton>
        ) : null}
      </div>
      {actions ? (
        // -my-1 lets a 32px button sit in the 48px strip, so a header with
        // actions is as tall as one without.
        <div className="-my-1 flex shrink-0 items-center gap-3">
          {meta ? (
            <span className="text-xs text-muted-foreground">{meta}</span>
          ) : null}
          {actions}
        </div>
      ) : meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}
