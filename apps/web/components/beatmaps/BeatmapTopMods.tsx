import { Layers } from 'lucide-react';

import { Badge } from '@/components/kit/status/Badge';
import { CATEGORICAL_OTHER } from '@/lib/kit/color/categorical';
import { MOD_FILL_FOREGROUND, getModPaletteColor } from '@/lib/kit/color/mods';
import { formatPercent } from '@/lib/kit/format/number';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import {
  BEATMAP_MOD_OTHER_LABEL,
  getBeatmapModLabel,
  selectBeatmapListModGroups,
} from '@/lib/utils/mods';

type TopMod = NonNullable<BeatmapListItem['topMods']>[number];

/** The pill's label and fill: the mod palette, or the "Other" grey. */
function modPill({ mod, mods }: TopMod) {
  if (mod === BEATMAP_MOD_OTHER_LABEL) {
    return { label: mod, background: CATEGORICAL_OTHER.css };
  }

  return {
    label: getBeatmapModLabel(mods),
    background: getModPaletteColor(mods),
  };
}

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
        className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden"
      >
        {displayedMods.map((topMod) => {
          const { label, background } = modPill(topMod);

          return (
            <li
              key={`${topMod.mods}-${topMod.mod}`}
              data-testid="beatmap-mod-group"
              className="flex"
            >
              <Badge
                customColor={{ background, foreground: MOD_FILL_FOREGROUND }}
                className="tabular-nums"
              >
                <span className="font-semibold">{label}</span>
                <span>{formatPercent(topMod.percentage / 100)}</span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
