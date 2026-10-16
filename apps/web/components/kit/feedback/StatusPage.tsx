import type * as React from 'react';

import { STATE_TONE, type StateTone } from '@/lib/kit/feedback/state-layout';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * The one layout for whole-page outcomes: not found, unauthorized, banned
 * and route errors. An icon, a short h1, one sentence and, when the page
 * offers a way forward, one action, centred in the content column,
 * matching the route error screen.
 */
export function StatusPage({
  icon: Icon,
  tone = 'neutral',
  title,
  description,
  action,
  background,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  icon: KitIcon;
  /** `destructive` for failures and bans; `neutral` for everything else. */
  tone?: StateTone;
  /** The page's h1, a few words in sentence case. */
  title: React.ReactNode;
  /** One sentence on what happened or what to do. */
  description?: React.ReactNode;
  /** One button; a route error may put a way back before its Try again. */
  action?: React.ReactNode;
  /** Decorative art behind the content, such as the 404's blurred shapes. */
  background?: React.ReactNode;
  /** Details between the sentence and the action, such as a ban reason. */
  children?: React.ReactNode;
}) {
  const colors = STATE_TONE[tone];

  return (
    <div
      data-slot="status-page"
      className={cn(
        'relative isolate flex min-h-[26rem] w-full flex-col items-center justify-center overflow-hidden px-4 py-12 text-center',
        className
      )}
      {...props}
    >
      {background ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          {background}
        </div>
      ) : null}
      <span
        className={cn(
          'mb-4 flex size-12 items-center justify-center rounded-full',
          colors.badge
        )}
      >
        <Icon className={cn('size-6', colors.icon)} aria-hidden />
      </span>
      <h1 className="text-xl font-semibold text-balance">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-4 w-full max-w-sm text-sm">{children}</div>
      ) : null}
      {action ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
