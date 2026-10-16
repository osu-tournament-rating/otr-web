import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The type scale: 30px page titles, 16px section and row titles, 14px body,
 * 12px labels. Reach for these instead of choosing sizes by hand. All text is
 * sentence case.
 */
export const typeScale = {
  /** The page's h1: 24px on phones, 30px from `sm`. */
  pageTitle: 'text-2xl font-bold tracking-tight sm:text-3xl',
  /** The one-line description under a page title. */
  pageDescription: 'text-sm leading-6 text-muted-foreground sm:text-base',
  /** Panel and section headings. */
  sectionTitle: 'text-base font-semibold',
  /** The name on a list row or a tile that stands for an entity. */
  rowTitle: 'text-base font-medium',
  /** Running text, table cells and row details. */
  body: 'text-sm',
  /** Secondary text: descriptions and row details. */
  bodyMuted: 'text-sm text-muted-foreground',
  /** Field, column, tile and group labels. */
  label: 'text-xs font-medium text-muted-foreground',
  /** Counts and notes beside a heading. */
  meta: 'text-xs text-muted-foreground',
} as const;

/** The page's one h1, for pages that do not use PageHeader or DetailHero. */
export function PageTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return <h1 className={cn(typeScale.pageTitle, className)} {...props} />;
}

/** A 16px semibold heading. SectionHeader already renders one. */
export function SectionTitle({
  level = 2,
  className,
  ...props
}: React.ComponentProps<'h2'> & {
  /** Heading level; follow the page outline, never skip a level. */
  level?: 2 | 3 | 4;
}) {
  const Heading = `h${level}` as const;
  return (
    <Heading className={cn(typeScale.sectionTitle, className)} {...props} />
  );
}

/** The 16px medium name on a row, card or entity tile. */
export function RowTitle({
  as: Tag = 'p',
  className,
  ...props
}: Omit<React.ComponentProps<'p'>, 'ref'> & {
  as?: 'p' | 'span' | 'div' | 'h3' | 'h4';
}) {
  return <Tag className={cn(typeScale.rowTitle, className)} {...props} />;
}

/** Small muted caption used for column and group labels. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn(typeScale.label, className)} {...props} />;
}
