'use client';

import { ChevronDown, Shield } from 'lucide-react';
import type * as React from 'react';

import {
  ActionMenu,
  type MenuAction,
} from '@/components/kit/controls/ActionMenu';
import { Button } from '@/components/kit/controls/Button';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { cn } from '@/lib/utils';

export type AdminMenuProps = {
  /** Falsy entries are skipped, so `isLazer && { … }` works. */
  actions: readonly (MenuAction | false | null | undefined)[];
  /** A muted line at the top of the menu, such as the entity's name. */
  title?: React.ReactNode;
  /** On cover art: the dark pill, white in both themes. */
  onArt?: boolean;
  /** Shows the notification dot on the button; the text is for screen readers ("Has admin notes"). */
  notification?: string;
  /** The button text. Keep "Admin" unless a page has two admin menus. */
  label?: string;
  className?: string;
  'data-testid'?: string;
};

/**
 * The one admin control on a detail page: an "Admin" button in the hero's
 * `adminActions` slot that opens every admin action for the entity as a
 * labelled list, destructive items last and red. Render it only for admins.
 */
export function AdminMenu({
  actions,
  title,
  onArt = false,
  notification,
  label = 'Admin',
  className,
  'data-testid': testId,
}: AdminMenuProps) {
  return (
    <ActionMenu
      title={title}
      actions={actions}
      data-testid={testId ? `${testId}-content` : undefined}
      trigger={
        <Button
          variant={onArt ? 'overlay' : 'outline'}
          size="sm"
          data-testid={testId}
          className={cn('gap-1.5', className)}
        >
          <Shield
            className={onArt ? 'text-white/80' : 'text-muted-foreground'}
            aria-hidden
          />
          {label}
          {notification ? (
            <NotificationDot
              label={notification}
              className={onArt ? 'ring-1 ring-black/40' : undefined}
            />
          ) : null}
          <ChevronDown
            className={cn(
              '-mr-0.5',
              onArt ? 'text-white/80' : 'text-muted-foreground'
            )}
            aria-hidden
          />
        </Button>
      }
    />
  );
}
