import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { typeScale } from '@/components/kit/layout/Typography';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * The top of every list or tool page: icon, the page's h1, a one-line
 * description, actions on the right and a divider underneath. Detail pages
 * use DetailHero instead. Place it first in a PageFrame.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  back,
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'title' | 'children'> & {
  /** The page's own icon, muted. */
  icon?: KitIcon;
  title: React.ReactNode;
  /** One sentence on what the page is for. */
  description?: React.ReactNode;
  /** Page-level buttons. They stack full width on phones. */
  actions?: React.ReactNode;
  /** A link back to the parent page, in place of breadcrumbs. */
  back?: { href: string; label: string };
}) {
  return (
    <header
      data-slot="page-header"
      // mb-2 on top of PageFrame's gap keeps 24px between divider and content.
      className={cn(
        'mb-2 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
      {...props}
    >
      <div className="max-w-2xl min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-3 -ml-1 flex w-fit items-center gap-1 rounded-sm pr-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <div className="flex items-center gap-3">
          {Icon ? (
            <Icon
              className="size-7 shrink-0 text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <h1 className={cn(typeScale.pageTitle, 'min-w-0 break-words')}>
            {title}
          </h1>
        </div>
        {description ? (
          <p className={cn('mt-3', typeScale.pageDescription)}>{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
