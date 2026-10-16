'use client';

import { Ellipsis } from 'lucide-react';

import {
  ActionMenu,
  type MenuAction,
} from '@/components/kit/controls/ActionMenu';
import { IconButton } from '@/components/kit/controls/IconButton';

export type RowActionsMenuProps = {
  /** Falsy entries are skipped, so `isAdmin && { … }` works. */
  actions: readonly (MenuAction | false | null | undefined)[];
  /**
   * What the row is, such as "Hidden Chamber [Insane]". It names the button
   * for screen readers ("Actions for …") and heads the menu.
   */
  itemName?: string;
  /** The tooltip. */
  label?: string;
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
  onArt = false,
  size = 'sm',
  className,
  'data-testid': testId,
}: RowActionsMenuProps) {
  return (
    <ActionMenu
      title={itemName}
      actions={actions}
      data-testid={testId ? `${testId}-content` : undefined}
      trigger={
        <IconButton
          label={itemName ? `${label} for ${itemName}` : label}
          tooltip={label}
          icon={Ellipsis}
          variant={onArt ? 'overlay' : 'ghost'}
          size={size}
          data-testid={testId}
          className={className}
        />
      }
    />
  );
}
