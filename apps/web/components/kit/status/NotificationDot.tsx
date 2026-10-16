import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The one "something new" dot, such as unseen reports on the Admin menu
 * item or an unread report update. Inline it after a label, or pin it to
 * the corner of an icon or avatar inside a `relative` parent. It carries
 * its own screen-reader text, so always pass `label`.
 */
export function NotificationDot({
  label,
  placement = 'inline',
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  /** What is new, read by screen readers: "Unseen reports". */
  label: string;
  /** `corner` sits on the top-right corner of a `relative` parent. */
  placement?: 'inline' | 'corner';
}) {
  return (
    <span
      data-slot="notification-dot"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full bg-notification',
        placement === 'corner' &&
          'pointer-events-none absolute top-0 right-0 ring-2 ring-background',
        className
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
