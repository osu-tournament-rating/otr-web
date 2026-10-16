import Link from 'next/link';
import type * as React from 'react';

import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/** Shared by the link tabs here and the in-page tabs in HeroTabsList. */
export const heroTabListClassName = 'flex overflow-x-auto px-1.5 sm:px-3';

/** Shared by the link tabs here and the in-page tabs in HeroTabsList. */
export const heroTabClassName = cn(
  'relative inline-flex h-11 shrink-0 items-center gap-2 px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground sm:px-3 sm:after:inset-x-3',
  'focus-visible:rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
  'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
  'aria-[current=page]:text-foreground aria-[current=page]:after:bg-primary',
  'data-[state=active]:text-foreground data-[state=active]:after:bg-primary'
);

/** The width from which tab counts show; below it they are read, not shown. */
export type HeroTabCountsFrom = 'sm' | 'md';

/**
 * Hides every tab's count below the breakpoint, keeping it in the tab's
 * accessible name, so four tabs with counts fit a 360px phone.
 */
export const heroTabCountsFromClassName: Record<HeroTabCountsFrom, string> = {
  sm: 'max-sm:[&_[data-slot=hero-tab-count]]:sr-only',
  md: 'max-md:[&_[data-slot=hero-tab-count]]:sr-only',
};

export type HeroTabItem = {
  value: string;
  label: React.ReactNode;
  /**
   * A shorter label shown below `sm`, such as "Tournament" for "This
   * tournament". Screen readers always hear `label`.
   */
  compactLabel?: React.ReactNode;
  href: string;
  icon?: KitIcon;
  /** Already formatted, such as "1,204". */
  count?: React.ReactNode;
  /** Becomes the link's `data-testid`. */
  testId?: string;
};

/** The label, icon and count inside one hero tab. */
export function HeroTabLabel({
  icon: Icon,
  count,
  compactLabel,
  children,
}: {
  icon?: KitIcon;
  count?: React.ReactNode;
  /** Shown instead of `children` below `sm`; `children` stays the accessible name. */
  compactLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {compactLabel != null ? (
        <>
          <span aria-hidden="true" className="sm:hidden">
            {compactLabel}
          </span>
          <span className="max-sm:sr-only">{children}</span>
        </>
      ) : (
        children
      )}
      {count != null ? (
        <span
          data-slot="hero-tab-count"
          className="text-xs font-normal text-muted-foreground tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </>
  );
}

/**
 * Tabs that switch between views of one entity, attached under its
 * DetailHero, or at the top of the one panel of a page with a PageHeader
 * (an audit history). Each tab is a link, so the view lives in the address.
 * Never use them to pick a ruleset or to scope a list.
 */
export function HeroTabs({
  items,
  value,
  countsFrom,
  className,
  ...props
}: Omit<React.ComponentProps<'nav'>, 'children'> & {
  items: HeroTabItem[];
  /** The current tab's `value`. */
  value: string;
  /** Names the set of views, such as "Tournament views". */
  'aria-label': string;
  /**
   * Shows counts only from this width up; below it they stay in each tab's
   * accessible name. `sm` fits four tabs with counts on a 360px phone.
   */
  countsFrom?: HeroTabCountsFrom;
}) {
  return (
    <nav
      data-slot="hero-tabs"
      className={cn(
        heroTabListClassName,
        countsFrom && heroTabCountsFromClassName[countsFrom],
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          data-testid={item.testId}
          aria-current={item.value === value ? 'page' : undefined}
          className={heroTabClassName}
        >
          <HeroTabLabel
            icon={item.icon}
            count={item.count}
            compactLabel={item.compactLabel}
          >
            {item.label}
          </HeroTabLabel>
        </Link>
      ))}
    </nav>
  );
}
