import type * as React from 'react';

import { cn } from '@/lib/utils';

export type GalleryTheme = 'light' | 'dark';

/** One themed copy of a specimen. `theme-light` forces light inside a dark page. */
function ThemeFrame({
  theme,
  className,
  children,
}: {
  theme: GalleryTheme;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">
        {theme === 'light' ? 'Light' : 'Dark'}
      </span>
      <div
        data-theme-frame={theme}
        className={cn(
          theme === 'light' ? 'theme-light' : 'dark',
          'min-w-0 rounded-lg border bg-background p-4 text-foreground',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A component shown in both themes, with its name, import path and a short
 * note on when to use it. Popovers, tooltips and dialogs open in the page's
 * own theme, because they render outside the frame. Pass a function as
 * `children` when the two copies need something different, such as ids that
 * must be unique on the page.
 */
export function Specimen({
  id,
  name,
  importPath,
  description,
  stacked = false,
  frameClassName,
  children,
}: {
  /** Stable anchor, linked from the web-design skill. */
  id: string;
  name: string;
  importPath?: string;
  description?: React.ReactNode;
  /** Put the light and dark copies above each other, for wide specimens. */
  stacked?: boolean;
  frameClassName?: string;
  children: React.ReactNode | ((theme: GalleryTheme) => React.ReactNode);
}) {
  const render = (theme: GalleryTheme) =>
    typeof children === 'function' ? children(theme) : children;

  return (
    <div
      id={id}
      data-specimen={id}
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium">{name}</h3>
        {importPath ? (
          <p className="text-xs break-words text-muted-foreground">
            {importPath}
          </p>
        ) : null}
        {description ? (
          <p className="max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          'grid gap-3',
          stacked ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
        )}
      >
        <ThemeFrame theme="light" className={frameClassName}>
          {render('light')}
        </ThemeFrame>
        <ThemeFrame theme="dark" className={frameClassName}>
          {render('dark')}
        </ThemeFrame>
      </div>
    </div>
  );
}

/** A family of components, such as layout or status. */
export function GallerySection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-gallery-section={id}
      className="flex scroll-mt-20 flex-col gap-8 border-t pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
