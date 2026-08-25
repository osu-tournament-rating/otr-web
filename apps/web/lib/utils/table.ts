// The shadcn table container scrolls horizontally, which would otherwise be the sticky scrollport.

/** Sticky column headers from `md` up. Compose onto the element wrapping a `Table` whose header row has an opaque background. */
export const stickyTableHeader =
  'md:overflow-x-visible md:[&_[data-slot=table-container]]:overflow-x-visible md:[&_th]:sticky md:[&_th]:top-(--header-height-px) md:[&_th]:z-20 md:[&_th]:border-b md:[&_th]:bg-inherit';

/** Sticky column headers for a table that scrolls inside its own container. Compose onto that container. */
export const stickyTableHeaderInScrollArea =
  '[&_[data-slot=table-container]]:overflow-x-visible [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:border-b [&_th]:bg-inherit';
