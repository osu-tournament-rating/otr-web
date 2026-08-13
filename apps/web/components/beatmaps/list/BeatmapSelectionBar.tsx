'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

/**
 * The floating bar that carries the actions for a table's current selection.
 * It sits over the page rather than above the table so the count and its
 * actions stay reachable however far the table has been scrolled.
 */
export default function BeatmapSelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  /** The actions themselves, so this component owns no mutation of its own. */
  children: ReactNode;
}) {
  return (
    <div
      // Only the bar itself takes pointer events: the strip spans the viewport
      // and would otherwise swallow clicks on the page beneath it.
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      role="region"
      aria-label="Beatmap selection actions"
    >
      <div
        data-testid="beatmap-selection-bar"
        className="animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex items-center gap-2 rounded-full border bg-popover/95 py-1.5 pr-1.5 pl-4 shadow-lg backdrop-blur"
      >
        <span aria-live="polite" className="text-sm font-medium">
          {count} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={onClear}
        >
          Clear
        </Button>
        {children}
      </div>
    </div>
  );
}
