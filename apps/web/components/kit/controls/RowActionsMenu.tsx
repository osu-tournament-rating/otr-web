'use client';

import { Ellipsis } from 'lucide-react';

import {
  ActionMenu,
  type MenuAction,
} from '@/components/kit/controls/ActionMenu';
import { IconButton } from '@/components/kit/controls/IconButton';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { cn } from '@/lib/utils';

export type RowActionsMenuProps = {
  /** Falsy entries are skipped, so `isAdmin && { … }` works. */
  actions: readonly (MenuAction | false | null | undefined)[];
  /**
   * What the row is, such as "Hidden Chamber [Insane]". It names the button
   * for screen readers ("Actions for …") and heads the menu. Keep it unique
   * in the list: two rows with the same name give two buttons with the same
   * name, so add what tells them apart ("Game 3: Hidden Chamber [Insane]").
   */
  itemName?: string;
  /** The tooltip. */
  label?: string;
  /**
   * Shows the notification dot on the "…" button, as AdminMenu does; the
   * text joins the button's accessible name ("Has admin notes").
   */
  notification?: string;
  /** On cover art: the round dark pill. */
  onArt?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  'data-testid'?: string;
};

/**
 * The overflow menu at the end of a row or card, such as a game or score on
 * the match page: one "…" button in place of a cluster of icons. Its items
 * work like AdminMenu's.
 */
export function RowActionsMenu({
  actions,
  itemName,
  label = 'Actions',
  notification,
  onArt = false,
  size = 'sm',
  className,
  'data-testid': testId,
}: RowActionsMenuProps) {
  const name = itemName ? `${label} for ${itemName}` : label;

  return (
    <ActionMenu
      title={itemName}
      actions={actions}
      data-testid={testId ? `${testId}-content` : undefined}
      trigger={
        <IconButton
          label={notification ? `${name}, ${notification}` : name}
          tooltip={label}
          icon={Ellipsis}
          variant={onArt ? 'overlay' : 'ghost'}
          size={size}
          data-testid={testId}
          className={cn(notification && 'relative', className)}
        >
          {notification ? (
            // The button's name already says it; the dot is for sight.
            <NotificationDot
              label={notification}
              placement="corner"
              aria-hidden="true"
              className={cn(
                'top-1 right-1',
                onArt ? 'ring-1 ring-black/40' : 'ring-0'
              )}
            />
          ) : null}
        </IconButton>
      }
    />
  );
}
