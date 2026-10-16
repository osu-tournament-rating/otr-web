import type * as React from 'react';

import { Panel } from '@/components/kit/layout/Panel';
import { typeScale } from '@/components/kit/layout/Typography';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

// Art always sits under the same dark matte, in both themes, so text and
// icons on it are white rather than theme tokens.
const ART_MATTE = 'bg-black/60';
const ON_ART_TEXT = 'text-white';
const ON_ART_SUFFIX = 'text-white/85';
const ON_ART_META = 'text-white/80';

type DetailHeroProps = Omit<React.ComponentProps<'header'>, 'title' | 'ref'> & {
  /** Cover art, filling its box (`fill` image or `absolute inset-0`). Leave it out for a plain panel. */
  art?: React.ReactNode;
  /** An avatar or logo before the title. */
  leading?: React.ReactNode;
  /** The entity's name. It becomes the page's h1. */
  title: React.ReactNode;
  /** Muted text after the title, such as a difficulty name or abbreviation. */
  titleSuffix?: React.ReactNode;
  /** The verification status, first in the row under the title. */
  status?: React.ReactNode;
  /** HeroMetaItems after the status, in the same row. */
  meta?: React.ReactNode;
  /** The one admin cluster, at the top right. */
  adminActions?: React.ReactNode;
  /** Public actions, such as an audio preview or report, at the bottom right. */
  actions?: React.ReactNode;
  /** HeroTabs or HeroTabsList, attached along the bottom edge. */
  tabs?: React.ReactNode;
  /** Extra full-width rows under the title block, divided from each other. */
  children?: React.ReactNode;
};

/**
 * The top of every detail page (beatmap, tournament, match, player): the
 * entity's name as the h1, one row of status and metadata, one admin cluster
 * at the top right, and the entity's view tabs attached underneath. With
 * `art` it is the beatmap hero; without, the same layout on a plain panel.
 */
export function DetailHero({
  art,
  leading,
  title,
  titleSuffix,
  status,
  meta,
  adminActions,
  actions,
  tabs,
  children,
  className,
  ...props
}: DetailHeroProps) {
  const hasArt = art != null && art !== false;
  const identity = (
    <HeroIdentity
      onArt={hasArt}
      leading={leading}
      title={title}
      titleSuffix={titleSuffix}
      status={status}
      meta={meta}
    />
  );

  return (
    <Panel as="header" data-slot="detail-hero" className={className} {...props}>
      {hasArt ? (
        <div className="group relative isolate h-48 overflow-hidden bg-muted sm:h-56">
          <div className="absolute inset-0">{art}</div>
          <div className={cn('absolute inset-0', ART_MATTE)} aria-hidden />

          {adminActions ? (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 sm:top-6 sm:right-6">
              {adminActions}
            </div>
          ) : null}
          {actions ? (
            <div className="absolute right-4 bottom-4 z-20 flex items-center gap-2 sm:right-6 sm:bottom-6">
              {actions}
            </div>
          ) : null}

          <div
            className={cn(
              'relative z-10 flex h-full items-end p-4 sm:p-6',
              ON_ART_TEXT,
              actions && 'pr-28 sm:pr-32'
            )}
          >
            {identity}
          </div>
        </div>
      ) : (
        // On phones the buttons move to one row above the name, so a long
        // name keeps the full width instead of wrapping beside them.
        <div className="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-6">
          {identity}
          {adminActions || actions ? (
            <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:items-end sm:justify-between sm:self-stretch">
              {actions ? (
                <div className="flex items-center gap-2 sm:order-last sm:mt-auto">
                  {actions}
                </div>
              ) : null}
              {adminActions ? (
                <div className="flex items-center gap-2">{adminActions}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {children ? (
        <div className={cn('divide-y', !hasArt && 'border-t')}>{children}</div>
      ) : null}
      {tabs ? <div className="border-t">{tabs}</div> : null}
    </Panel>
  );
}

function HeroIdentity({
  onArt,
  leading,
  title,
  titleSuffix,
  status,
  meta,
}: Pick<
  DetailHeroProps,
  'leading' | 'title' | 'titleSuffix' | 'status' | 'meta'
> & { onArt: boolean }) {
  return (
    <div
      className={cn(
        'flex min-w-0 gap-4',
        onArt ? 'max-w-4xl items-end' : 'items-center'
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1
            className={cn(
              typeScale.pageTitle,
              'leading-tight text-balance break-words'
            )}
          >
            {title}
          </h1>
          {titleSuffix ? (
            <p
              className={cn(
                'text-sm font-semibold sm:text-lg',
                onArt ? ON_ART_SUFFIX : 'text-muted-foreground'
              )}
            >
              {titleSuffix}
            </p>
          ) : null}
        </div>

        {status || meta ? (
          <div
            className={cn(
              'mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm',
              onArt ? ON_ART_META : 'text-muted-foreground'
            )}
          >
            {status}
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** One fact in a DetailHero's metadata row: a 16px icon and short text. */
export function HeroMetaItem({
  icon: Icon,
  children,
  className,
  ...props
}: React.ComponentProps<'span'> & { icon?: KitIcon }) {
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1.5', className)}
      {...props}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
