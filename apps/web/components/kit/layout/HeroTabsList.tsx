import * as TabsPrimitive from '@radix-ui/react-tabs';
import type * as React from 'react';

import {
  heroTabClassName,
  type HeroTabCountsFrom,
  heroTabCountsFromClassName,
  heroTabListClassName,
  HeroTabLabel,
} from '@/components/kit/layout/HeroTabs';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

// No 'use client': Radix Tabs carries its own boundary, so server pages can
// pass lucide icons to HeroTabsTrigger.

/**
 * In-page hero tabs, for views held in component state rather than the
 * address. Wrap the DetailHero and the views in HeroTabsRoot, put
 * HeroTabsList in the hero's `tabs` slot and each view in a HeroTabsContent.
 * Prefer the link-based HeroTabs when the view should survive a reload.
 */
export function HeroTabsRoot({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="hero-tabs-root"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

/** The tab strip; goes in DetailHero's `tabs` slot. */
export function HeroTabsList({
  countsFrom,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  /** Shows counts only from this width up, as on HeroTabs. */
  countsFrom?: HeroTabCountsFrom;
}) {
  return (
    <TabsPrimitive.List
      data-slot="hero-tabs-list"
      className={cn(
        heroTabListClassName,
        countsFrom && heroTabCountsFromClassName[countsFrom],
        className
      )}
      {...props}
    />
  );
}

/** One in-page tab. */
export function HeroTabsTrigger({
  icon,
  count,
  compactLabel,
  children,
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  icon?: KitIcon;
  /** Already formatted, such as "1,204". */
  count?: React.ReactNode;
  /** A shorter label shown below `sm`; `children` stays the accessible name. */
  compactLabel?: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        heroTabClassName,
        'cursor-pointer disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      <HeroTabLabel icon={icon} count={count} compactLabel={compactLabel}>
        {children}
      </HeroTabLabel>
    </TabsPrimitive.Trigger>
  );
}

/** One view; panels inside it stay 16px apart. */
export function HeroTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('flex flex-col gap-4 outline-none', className)}
      {...props}
    />
  );
}
