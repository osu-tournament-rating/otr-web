import { SearchX } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { Button } from '@/components/kit/controls/Button';
import {
  STATE_LAYOUT,
  STATE_TONE,
  type StateSize,
} from '@/lib/kit/feedback/state-layout';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/** Where "Clear filters" goes: the list's address without its filters, or a handler. */
export type ClearFiltersAction = { href: string } | { onClick: () => void };

/**
 * Takes the place of a list, table or chart with nothing to show, in the
 * section error's frame with a neutral icon, straight under the panel's
 * SectionHeader or ListToolbar. Pass `clearFilters` when the visitor's
 * filters emptied the list. `compact` fits a chart, a small panel or a
 * dialog.
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  clearFilters,
  action,
  size = 'regular',
  titleAs,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title' | 'children'> & {
  /** Neutral, never red. Defaults to a crossed-out magnifier. */
  icon?: KitIcon;
  /** Says what is missing: "No beatmaps match", "No pooled beatmaps". */
  title: React.ReactNode;
  /** One sentence on why, or what to try. */
  description?: React.ReactNode;
  /** Adds the "Clear filters" button. Only when filters caused the empty list. */
  clearFilters?: ClearFiltersAction;
  /** Another way forward, such as a "Submit a tournament" link. */
  action?: React.ReactNode;
  size?: StateSize;
  /** The title element. Regular is an h2, compact a paragraph. */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
}) {
  const layout = STATE_LAYOUT[size];
  const tone = STATE_TONE.neutral;
  const Title = titleAs ?? (size === 'regular' ? 'h2' : 'p');
  const hasActions = Boolean(clearFilters) || Boolean(action);

  return (
    <div
      data-slot="empty-state"
      data-size={size}
      className={cn(layout.root, className)}
      {...props}
    >
      <span className={cn(layout.badge, tone.badge)}>
        <Icon className={cn(layout.icon, tone.icon)} aria-hidden />
      </span>
      <Title className={layout.title}>{title}</Title>
      {description ? <p className={layout.description}>{description}</p> : null}
      {hasActions ? (
        <div className={layout.actions}>
          {clearFilters ? (
            'href' in clearFilters ? (
              <Button asChild variant="outline" size={layout.buttonSize}>
                <Link href={clearFilters.href}>Clear filters</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size={layout.buttonSize}
                onClick={clearFilters.onClick}
              >
                Clear filters
              </Button>
            )
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
