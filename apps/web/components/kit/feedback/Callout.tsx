import type * as React from 'react';

import {
  CALLOUT_TONE_CLASSES,
  CALLOUT_TONE_ICONS,
  type CalloutTone,
} from '@/lib/kit/feedback/callout';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

// Links in the text inherit the tone's colour, so an underline marks them.
const TEXT_LINKS =
  '[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-foreground';

/**
 * The one notice box: info for context, warning for something to check
 * before acting, danger for something that cannot be undone. `banner` is the
 * full-width strip under the site header. For a short warning inside a
 * panel, use CalloutChip.
 */
export function Callout({
  tone = 'info',
  icon,
  title,
  action,
  variant = 'block',
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  tone?: CalloutTone;
  /** Replaces the tone's glyph (info, triangle, octagon) when a closer one exists. */
  icon?: KitIcon;
  /** A short sentence-case lead, in semibold. */
  title?: React.ReactNode;
  /** One button or link, on the right from `sm` and under the text on phones. */
  action?: React.ReactNode;
  variant?: 'block' | 'banner';
}) {
  const Icon = icon ?? CALLOUT_TONE_ICONS[tone];

  if (variant === 'banner') {
    return (
      <div
        data-slot="callout"
        data-tone={tone}
        data-variant="banner"
        className={cn(
          'flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-center text-xs font-medium',
          CALLOUT_TONE_CLASSES[tone],
          className
        )}
        {...props}
      >
        <p className={cn('flex items-center gap-1.5', TEXT_LINKS)}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {/* Balanced lines: a wrapped strip never ends on one word. */}
          <span className="text-balance">
            {title ? <span className="font-semibold">{title} </span> : null}
            {children}
          </span>
        </p>
        {action ? <div className="text-foreground">{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      data-slot="callout"
      data-tone={tone}
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center',
        CALLOUT_TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1 leading-5">
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? (
            <div className={cn('text-pretty', TEXT_LINKS)}>{children}</div>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-7 text-foreground sm:pl-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}
