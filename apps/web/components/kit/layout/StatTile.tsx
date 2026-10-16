import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { Tile } from '@/components/kit/layout/Tile';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/** The grid behind a row of stat tiles: two columns on phones. */
export function StatTileGrid({
  columns = 3,
  className,
  ...props
}: React.ComponentProps<'dl'> & {
  /** Columns from `sm` up. */
  columns?: 2 | 3 | 4;
}) {
  return (
    <dl
      data-slot="stat-tile-grid"
      className={cn(
        'grid grid-cols-2 gap-2',
        columns === 3 && 'sm:grid-cols-3',
        columns === 4 && 'sm:grid-cols-4',
        className
      )}
      {...props}
    />
  );
}

/**
 * One number with its label, such as a rating, a count or a win rate. Put
 * tiles in a StatTileGrid inside a panel.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  adornment,
  sub,
  infoText,
  layout = 'stacked',
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  label: string;
  /** Already formatted, with separators on counts. */
  value: React.ReactNode;
  /** A small muted icon before the label. */
  icon?: KitIcon;
  /** Sits just left of the value, such as a 20px tier icon beside a rating. */
  adornment?: React.ReactNode;
  /** One muted line under the value. */
  sub?: React.ReactNode;
  /** How to read the stat, shown through an info button. */
  infoText?: React.ReactNode;
  /** `inline` puts a short value on the label's line, for attribute grids. */
  layout?: 'stacked' | 'inline';
  /** Extra content under everything, such as a gauge. */
  children?: React.ReactNode;
}) {
  const term = (
    <dt className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{label}</span>
      {infoText ? (
        <InfoButton label={`About ${label}`} size="sm" className="-my-0.5">
          {infoText}
        </InfoButton>
      ) : null}
    </dt>
  );
  const figure = (
    <span
      className={cn(
        // 4px between an adornment (the tier icon) and the value. Tabular
        // figures keep values in a row of tiles the same width per digit.
        'flex min-w-0 items-center gap-1 tabular-nums',
        layout === 'inline' ? 'text-lg font-semibold' : 'text-xl font-bold',
        // After the size: tailwind-merge drops a leading that precedes it.
        'leading-none'
      )}
    >
      {adornment ? (
        // -my-1: a 20–24px icon overhangs the 20px value line instead of
        // growing it, so values and sub lines stay level across the row.
        <span className="-my-1 flex shrink-0 items-center">{adornment}</span>
      ) : null}
      <span className="min-w-0">{value}</span>
    </span>
  );
  const subLine = sub ? (
    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">
      {sub}
    </span>
  ) : null;

  if (layout === 'inline') {
    return (
      <Tile
        className={cn(
          'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2',
          className
        )}
        {...props}
      >
        {term}
        <dd>{figure}</dd>
        {subLine || children ? (
          <dd className="col-span-2">
            {subLine}
            {children}
          </dd>
        ) : null}
      </Tile>
    );
  }

  return (
    <Tile className={cn('min-w-0', className)} {...props}>
      {term}
      <dd className="mt-1">
        {figure}
        {subLine}
        {children}
      </dd>
    </Tile>
  );
}
