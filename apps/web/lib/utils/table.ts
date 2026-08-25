// The shadcn table container scrolls horizontally, which would otherwise be the sticky scrollport.

/** Sticky column headers from `md` up. Compose onto the element wrapping a `Table` whose header row has an opaque background. */
export const stickyTableHeader =
  'md:overflow-x-visible md:[&_[data-slot=table-container]]:overflow-x-visible md:[&_th]:sticky md:[&_th]:top-(--header-height-px) md:[&_th]:z-20 md:[&_th]:border-b md:[&_th]:bg-inherit';

/** Sticky column headers from `lg` up, for a table that only fits its container at desktop widths. */
export const stickyTableHeaderFromLg =
  'lg:overflow-x-visible lg:[&_[data-slot=table-container]]:overflow-x-visible lg:[&_th]:sticky lg:[&_th]:top-(--header-height-px) lg:[&_th]:z-20 lg:[&_th]:border-b lg:[&_th]:bg-inherit';

/** Sticky column headers for a table that scrolls inside its own container. Compose onto that container. */
export const stickyTableHeaderInScrollArea =
  '[&_[data-slot=table-container]]:overflow-x-visible [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:border-b [&_th]:bg-inherit';
