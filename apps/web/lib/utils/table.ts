// shadcn's table container is overflow-x-auto

/** Needs an opaque background on the header row. */
export const stickyTableHeader =
  'md:overflow-x-visible md:[&_[data-slot=table-container]]:overflow-x-visible md:[&_th]:sticky md:[&_th]:top-(--header-height-px) md:[&_th]:z-30 md:[&_th]:border-b md:[&_th]:bg-inherit';

/** Needs an opaque background on the header row. */
export const stickyTableHeaderFromLg =
  'lg:overflow-x-visible lg:[&_[data-slot=table-container]]:overflow-x-visible lg:[&_th]:sticky lg:[&_th]:top-(--header-height-px) lg:[&_th]:z-30 lg:[&_th]:border-b lg:[&_th]:bg-inherit';

/** Compose onto the scrolling container, not the table. */
export const stickyTableHeaderInScrollArea =
  '[&_[data-slot=table-container]]:overflow-x-visible [&_th]:sticky [&_th]:top-0 [&_th]:z-30 [&_th]:border-b [&_th]:bg-inherit';
