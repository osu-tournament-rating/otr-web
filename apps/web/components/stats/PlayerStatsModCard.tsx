'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

import {
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import FilterChip from '@/components/filters/FilterChip';
import SingleModIcon from '@/components/icons/SingleModIcon';
import { LeaderList } from '@/components/stats/PlayerStatsLeaderCard';
import { ModsEnumHelper } from '@/lib/enum-helpers';
import type { Mods } from '@otr/core/osu';
import type { PlayerStats } from '@otr/core/stats/player-stats';

const modText = (mods: Mods) =>
  ModsEnumHelper.getMetadata(mods)[0]?.text ?? 'NM';

/** Most games played with one mod, chosen from the ruleset's chips. */
export default function PlayerStatsModCard({
  mods,
  entries,
}: {
  mods: readonly Mods[];
  entries: PlayerStats['mods'];
}) {
  const [selected, setSelected] = useState<Mods>(mods[0]);
  const leaders =
    entries.find((entry) => entry.mods === selected)?.leaders ?? [];

  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-mods">
      <SectionHeader
        icon={Star}
        title="Mod specialists"
        infoText="Most verified games played with the selected mod in this ruleset. Freemod picks count."
        meta={
          <div className="flex items-center gap-1.5">
            {mods.map((mod) => (
              <FilterChip
                key={mod}
                label={modText(mod)}
                iconOnly
                selected={mod === selected}
                onClick={() => setSelected(mod)}
                icon={<SingleModIcon mods={mod} size={24} />}
                className="h-7 w-10 p-0"
                data-testid={`stats-mod-chip-${mod}`}
              />
            ))}
          </div>
        }
      />
      <LeaderList leaders={leaders} unit={`games with ${modText(selected)}`} />
    </SectionCard>
  );
}
