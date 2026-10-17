'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/kit/controls/Button';
import { formatCount } from '@/lib/kit/format/number';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

/** Floating bar carrying the actions for a table's current selection. */
export default function BeatmapSelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const { state } = useAudioPlayer();
  // The same check that shows the audio preview transport.
  const hasTransport =
    state.currentTrack !== null && state.currentlyPlaying !== null;

  return (
    <div
      // Only the bar takes pointer events; the strip spans the viewport.
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4',
        // 1rem above the transport, whose spacer is h-32 sm:h-22.
        hasTransport ? 'bottom-36 sm:bottom-26' : 'bottom-6'
      )}
      role="region"
      aria-label="Beatmap selection actions"
    >
      <div
        data-testid="beatmap-selection-bar"
        className="pointer-events-auto flex items-center gap-2 rounded-full border bg-popover/95 py-1.5 pr-1.5 pl-4 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2"
      >
        <span aria-live="polite" className="text-sm font-medium">
          {formatCount(count)} selected
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
