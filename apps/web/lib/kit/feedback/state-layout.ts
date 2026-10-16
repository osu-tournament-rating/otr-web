/**
 * The frame shared by empty and error states, so an empty list and a failed
 * one look the same at each size. The regular size is the section error's
 * layout (`components/error/SectionError.tsx`), which the beatmap lists'
 * empty panel already copied.
 */
export type StateSize = 'regular' | 'compact';

export interface StateLayout {
  root: string;
  /** The round badge behind the icon. */
  badge: string;
  icon: string;
  title: string;
  description: string;
  /** The row of buttons under the text. */
  actions: string;
  /** The `Button` size the actions take. */
  buttonSize: 'default' | 'sm';
}

export const STATE_LAYOUT: Readonly<Record<StateSize, StateLayout>> = {
  regular: {
    root: 'flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center',
    badge: 'mb-4 flex size-12 items-center justify-center rounded-full',
    icon: 'size-6',
    title: 'text-lg font-semibold',
    description: 'mt-1 max-w-sm text-sm leading-6 text-muted-foreground',
    actions: 'mt-5 flex flex-wrap items-center justify-center gap-2',
    buttonSize: 'default',
  },
  compact: {
    root: 'flex flex-col items-center justify-center px-4 py-8 text-center',
    badge: 'mb-3 flex size-9 items-center justify-center rounded-full',
    icon: 'size-4.5',
    title: 'text-sm font-semibold text-balance',
    description: 'mt-0.5 max-w-sm text-sm text-muted-foreground',
    actions: 'mt-3 flex flex-wrap items-center justify-center gap-2',
    buttonSize: 'sm',
  },
};

export type StateTone = 'neutral' | 'destructive';

/** Neutral for "nothing here", red only for a failure. */
export const STATE_TONE: Readonly<
  Record<StateTone, { badge: string; icon: string }>
> = {
  neutral: {
    badge: 'bg-muted dark:bg-secondary',
    icon: 'text-muted-foreground',
  },
  destructive: {
    badge: 'bg-destructive/10',
    icon: 'text-destructive',
  },
};
