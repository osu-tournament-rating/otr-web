import { Layers } from 'lucide-react';

import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import { formatPercentage } from '@/lib/utils/chart';
import {
  getModColor,
  getModForegroundColor,
  selectBeatmapListModGroups,
} from '@/lib/utils/mods';

/** The mod pills summarising which mods a beatmap's scores were set under. */
export default function BeatmapTopMods({
  mods,
  fixedWidth = false,
  showIcon = true,
}: {
  mods: NonNullable<BeatmapListItem['topMods']>;
  /** Reserve a fixed slot so mods line up across compact-layout rows. */
  fixedWidth?: boolean;
  /** Drop the leading glyph where a neighboring column already carries numbers. */
  showIcon?: boolean;
}) {
  if (mods.length === 0) {
    return (
      <div
        data-testid="beatmap-mods-summary"
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          fixedWidth && 'w-52'
        )}
      >
        {showIcon ? (
          <Layers className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
        <span className="text-xs">No mod data</span>
      </div>
    );
  }

  const displayedMods = selectBeatmapListModGroups(mods);

  return (
    <div
      data-testid="beatmap-mods-summary"
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5',
        fixedWidth && 'w-52'
      )}
    >
      {showIcon ? (
        <Layers className="size-4 shrink-0" aria-hidden="true" />
      ) : null}
      <ul
        data-testid="beatmap-top-mods"
        aria-label="Top mods by score usage"
        className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden text-xs"
      >
        {displayedMods.map(({ mod, mods, percentage }) => (
          <li
            key={`${mods}-${mod}`}
            data-testid="beatmap-mod-group"
            className="inline-flex h-6 items-center gap-1 rounded-full border border-current/20 px-2 whitespace-nowrap"
            style={{
              backgroundColor: getModColor(mods),
              color: getModForegroundColor(mods),
            }}
          >
            <span className="font-semibold text-inherit">{mod}</span>
            <span className="font-medium text-inherit">
              {formatPercentage(percentage, 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
