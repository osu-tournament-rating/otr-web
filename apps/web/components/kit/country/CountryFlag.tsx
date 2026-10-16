import Image from 'next/image';
import type * as React from 'react';

import TapTooltip from '@/components/tap-tooltip';
import { getCountryFlagUrl, getCountryName } from '@/lib/kit/format/country';
import { cn } from '@/lib/utils';

export type CountryFlagSize = 'sm' | 'md';

/**
 * osu!'s flags are 70×47. Both sides are set in CSS as well as in the
 * attributes, so the page's `height: auto` never resizes one side alone
 * (which next/image warns about); `object-cover` trims the sub-pixel rest.
 */
export const COUNTRY_FLAG_SIZES: Readonly<
  Record<CountryFlagSize, { width: number; height: number }>
> = {
  sm: { width: 16, height: 11 },
  md: { width: 21, height: 14 },
};

/**
 * A country's flag. Its English name opens on tap, hover and keyboard focus
 * (the flag becomes a button), unless `tooltip` is off or it is
 * `decorative`. The name is worked out where this renders: render it from a
 * server component, or pass `name` from one, so the browser's own region
 * names never come into it.
 */
export function CountryFlag({
  code,
  name,
  size = 'md',
  tooltip = true,
  decorative = false,
  className,
}: {
  /** The code osu! stores, such as `AU`. Renders nothing when empty. */
  code: string | null | undefined;
  /** The English name, from `getCountryName` on the server. */
  name?: string;
  /** `sm` (16×11) beside 12–14px text, `md` (21×14, default) in rows and heroes. */
  size?: CountryFlagSize;
  /** Names the country on tap, hover and focus. Off: the image's alt text names it. */
  tooltip?: boolean;
  /**
   * Hides the flag from assistive tech, with no tooltip, because the name is
   * written beside it or the link around it names the country.
   */
  decorative?: boolean;
  className?: string;
}) {
  if (!code) return null;

  const label = name ?? getCountryName(code);
  const { width, height } = COUNTRY_FLAG_SIZES[size];
  const interactive = tooltip && !decorative;

  const flag = (
    <Image
      src={getCountryFlagUrl(code)}
      alt={decorative || interactive ? '' : label}
      aria-hidden={decorative || undefined}
      width={width}
      height={height}
      style={{ width, height }}
      data-slot="country-flag"
      className={cn(
        'inline-block shrink-0 rounded-xs object-cover align-middle ring-1 ring-foreground/10',
        !interactive && className
      )}
    />
  );

  if (!interactive) return flag;

  return (
    <TapTooltip
      content={label}
      side="top"
      triggerAriaLabel={label}
      // The padding widens the tap area; the negative margin keeps the flag in place.
      triggerClassName={cn(
        '-m-1 inline-flex w-auto shrink-0 rounded-sm p-1 align-middle',
        className
      )}
    >
      {flag}
    </TapTooltip>
  );
}

/**
 * A flag and the country's English name, such as a profile's country or the
 * chosen country in a filter. The flag is decorative: the name is written
 * beside it.
 */
export function CountryName({
  code,
  name,
  size = 'md',
  truncate = false,
  className,
  ...props
}: {
  code: string | null | undefined;
  /** The English name, from `getCountryName` on the server. */
  name?: string;
  size?: CountryFlagSize;
  /** Cut a long name with an ellipsis instead of wrapping it. */
  truncate?: boolean;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  if (!code) return null;

  const label = name ?? getCountryName(code);

  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1.5', className)}
      {...props}
    >
      <CountryFlag code={code} name={label} size={size} decorative />
      <span className={cn('min-w-0', truncate ? 'truncate' : 'break-words')}>
        {label}
      </span>
    </span>
  );
}
