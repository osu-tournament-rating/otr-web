'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { groupMenuActions } from '@/lib/kit/controls/menu';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/** One item in an AdminMenu or RowActionsMenu. */
export type MenuAction = {
  /** Sentence case, verb first: "Edit tournament", "View audit history". */
  label: string;
  /** A lucide icon. It renders muted, or red on a destructive item. */
  icon?: KitIcon;
  /**
   * Runs once the menu has closed and focus is back on its trigger, so a
   * dialog it opens returns focus there when it closes.
   */
  onSelect?: () => void;
  /** Makes the item a link, such as the audit history. */
  href?: string;
  /** Opens `href` in a new tab, for osu! links. */
  external?: boolean;
  /** Red, and moved into the last group. For actions that delete or overwrite data. */
  destructive?: boolean;
  disabled?: boolean;
  /** A muted second line, such as why the item is disabled. */
  description?: React.ReactNode;
  /** Right-aligned extra, such as a count Badge or a NotificationDot. */
  trailing?: React.ReactNode;
  /** Items with the same group sit together between separators. */
  group?: string;
  /** Leaves the item out, for items that depend on state. */
  hidden?: boolean;
  /** React key when two items share a label. */
  id?: string;
  testId?: string;
};

export type ActionMenuProps = {
  /** The button that opens the menu. It is wrapped in DropdownMenuTrigger. */
  trigger: React.ReactElement;
  /** Falsy entries are skipped, so `isAdmin && { … }` works. */
  actions: readonly (MenuAction | false | null | undefined)[];
  /** A muted line at the top naming what the actions apply to. */
  title?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  contentClassName?: string;
  'data-testid'?: string;
};

/**
 * A menu of labelled actions behind one trigger, grouped by separators with
 * destructive items last and red. AdminMenu and RowActionsMenu supply the
 * trigger; use this directly only for a different trigger.
 */
export function ActionMenu({
  trigger,
  actions,
  title,
  align = 'end',
  side = 'bottom',
  contentClassName,
  'data-testid': testId,
}: ActionMenuProps) {
  const pendingAction = React.useRef<(() => void) | null>(null);
  const groups = groupMenuActions(actions);

  if (groups.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        collisionPadding={8}
        data-testid={testId}
        className={cn('min-w-52', contentClassName)}
        onCloseAutoFocus={() => {
          const action = pendingAction.current;
          pendingAction.current = null;

          if (action) {
            // The menu has unmounted and focus is about to return to the
            // trigger; open the dialog after that, so it returns focus there.
            window.setTimeout(action, 0);
          }
        }}
      >
        {title ? (
          <>
            <DropdownMenuLabel className="max-w-72 truncate text-xs font-medium text-muted-foreground">
              {title}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.map((action) => (
                <ActionMenuItem
                  key={action.id ?? action.label}
                  action={action}
                  onSelect={() => {
                    pendingAction.current = action.onSelect ?? null;
                  }}
                />
              ))}
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActionMenuItem({
  action,
  onSelect,
}: {
  action: MenuAction;
  onSelect: () => void;
}) {
  const {
    label,
    icon: Icon,
    href,
    external,
    destructive,
    disabled,
    description,
    trailing,
    testId,
  } = action;

  // A disabled item dims its icon and label but not its description, which
  // says why it is disabled and must stay readable.
  const dim = disabled && 'opacity-50';

  const content = (
    <>
      {Icon ? (
        <Icon
          className={cn(description && 'mt-0.5 self-start', dim)}
          aria-hidden
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        {/* Proportional figures keep Inter's hyphen narrow ("Pre-verified"). */}
        <span className={cn('proportional-nums', dim)}>{label}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {external ? (
        <ExternalLink className={cn('ml-2 size-3.5', dim)} aria-hidden />
      ) : null}
      {trailing ? (
        <span className={cn('ml-2 flex shrink-0 items-center', dim)}>
          {trailing}
        </span>
      ) : null}
    </>
  );

  const itemProps = {
    variant: destructive ? ('destructive' as const) : ('default' as const),
    disabled,
    'data-testid': testId,
    className: 'cursor-pointer data-[disabled]:opacity-100',
  };

  if (href && !disabled) {
    return (
      <DropdownMenuItem asChild {...itemProps}>
        {external ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {content}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link href={href} prefetch={false}>
            {content}
          </Link>
        )}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem {...itemProps} onSelect={onSelect}>
      {content}
    </DropdownMenuItem>
  );
}
