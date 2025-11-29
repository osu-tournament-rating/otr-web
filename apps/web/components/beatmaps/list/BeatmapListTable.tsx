'use client';

import {
  Star,
  Clock,
  Activity,
  ChevronUp,
  ChevronDown,
  Trophy,
  Gamepad2,
  Music,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { formatDuration } from '@/lib/utils/date';
import SimpleTooltip from '@/components/simple-tooltip';
import BeatmapBackground from '@/components/games/BeatmapBackground';
import type { BeatmapListItem, BeatmapListSort } from '@/lib/orpc/schema/beatmapList';
import type { beatmapListFilterSchema } from '@/lib/schema';
import type { z } from 'zod';

interface BeatmapListTableProps {
  beatmaps: BeatmapListItem[];
  filter: z.infer<typeof beatmapListFilterSchema>;
}

type SortField = BeatmapListSort;

export default function BeatmapListTable({
  beatmaps,
  filter,
}: BeatmapListTableProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = filter.sort;
  const isDescending = filter.descending;

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams();

    if (filter.q) params.set('q', filter.q);
    if (filter.minSr !== undefined) params.set('minSr', String(filter.minSr));
    if (filter.maxSr !== undefined) params.set('maxSr', String(filter.maxSr));
    if (filter.minBpm !== undefined) params.set('minBpm', String(filter.minBpm));
    if (filter.maxBpm !== undefined) params.set('maxBpm', String(filter.maxBpm));
    if (filter.minCs !== undefined) params.set('minCs', String(filter.minCs));
    if (filter.maxCs !== undefined) params.set('maxCs', String(filter.maxCs));
    if (filter.minAr !== undefined) params.set('minAr', String(filter.minAr));
    if (filter.maxAr !== undefined) params.set('maxAr', String(filter.maxAr));
    if (filter.minOd !== undefined) params.set('minOd', String(filter.minOd));
    if (filter.maxOd !== undefined) params.set('maxOd', String(filter.maxOd));
    if (filter.minHp !== undefined) params.set('minHp', String(filter.minHp));
    if (filter.maxHp !== undefined) params.set('maxHp', String(filter.maxHp));
    if (filter.minLength !== undefined) params.set('minLength', String(filter.minLength));
    if (filter.maxLength !== undefined) params.set('maxLength', String(filter.maxLength));
    if (filter.minGameCount !== undefined) params.set('minGameCount', String(filter.minGameCount));
    if (filter.maxGameCount !== undefined) params.set('maxGameCount', String(filter.maxGameCount));
    if (filter.minTournamentCount !== undefined) params.set('minTournamentCount', String(filter.minTournamentCount));
    if (filter.maxTournamentCount !== undefined) params.set('maxTournamentCount', String(filter.maxTournamentCount));

    params.set('sort', field);

    if (currentSort === field) {
      params.set('descending', String(!isDescending));
    } else {
      params.set('descending', 'true');
    }

    router.push(pathname + (params.size > 0 ? `?${params}` : ''));
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="hover:text-foreground flex items-center gap-1 whitespace-nowrap transition-colors"
    >
      {children}
      {currentSort === field &&
        (isDescending ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        ))}
    </button>
  );

  if (beatmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-muted-foreground text-lg font-semibold">
          No Beatmaps Found
        </h3>
        <p className="text-muted-foreground text-sm">
          Try adjusting your search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-muted-foreground w-[6%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  ID
                </th>
                <th className="text-muted-foreground w-[20%] px-2 py-2 text-left text-xs font-medium tracking-wider">
                  Difficulty
                </th>
                <th className="text-muted-foreground w-[10%] px-2 py-2 text-left text-xs font-medium tracking-wider">
                  <SortButton field="creator">Creator</SortButton>
                </th>
                <th className="text-muted-foreground w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Star Rating">
                    <div className="flex justify-center">
                      <SortButton field="sr">
                        <Star className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="BPM">
                    <div className="flex justify-center">
                      <SortButton field="bpm">
                        <Activity className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[5%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Circle Size">
                    <SortButton field="cs">CS</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[5%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Approach Rate">
                    <SortButton field="ar">AR</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[5%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Overall Difficulty">
                    <SortButton field="od">OD</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[5%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="HP Drain Rate">
                    <SortButton field="hp">HP</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Length">
                    <div className="flex justify-center">
                      <SortButton field="length">
                        <Clock className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Verified Tournaments">
                    <div className="flex justify-center">
                      <SortButton field="tournamentCount">
                        <Trophy className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Verified Games">
                    <div className="flex justify-center">
                      <SortButton field="gameCount">
                        <Gamepad2 className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
              </tr>
            </thead>

            <tbody className="divide-border divide-y">
              {beatmaps.map((beatmap, index) => (
                <tr
                  key={beatmap.id}
                  className={`hover:bg-muted/30 group cursor-pointer transition-colors ${
                    index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'
                  }`}
                  onClick={() => router.push(`/beatmaps/${beatmap.osuId}`)}
                >
                  <td className="px-2 py-2 text-center">
                    <Link
                      href={`/beatmaps/${beatmap.osuId}`}
                      className="text-muted-foreground hover:text-primary text-xs transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {beatmap.osuId}
                    </Link>
                  </td>

                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded">
                        {beatmap.beatmapsetOsuId ? (
                          <BeatmapBackground
                            beatmapsetId={beatmap.beatmapsetOsuId}
                            alt={`${beatmap.title} cover`}
                          />
                        ) : (
                          <div className="bg-muted flex h-full w-full items-center justify-center">
                            <Music className="text-muted-foreground h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/beatmaps/${beatmap.osuId}`}
                          className="hover:text-primary block transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="max-w-[280px] truncate text-xs font-medium">
                            {beatmap.artist} - {beatmap.title}
                          </p>
                          <p className="text-muted-foreground max-w-[240px] truncate text-xs">
                            [{beatmap.diffName}]
                          </p>
                        </Link>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2">
                    <span className="text-muted-foreground max-w-[100px] truncate text-xs">
                      {beatmap.creator ?? 'Unknown'}
                    </span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span className="text-xs font-medium">
                        {beatmap.sr.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">
                      {Math.round(beatmap.bpm)}
                    </span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">{beatmap.cs.toFixed(1)}</span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">{beatmap.ar.toFixed(1)}</span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">{beatmap.od.toFixed(1)}</span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">{beatmap.hp.toFixed(1)}</span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs">
                      {formatDuration(Number(beatmap.totalLength))}
                    </span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs font-medium">
                      {beatmap.verifiedTournamentCount}
                    </span>
                  </td>

                  <td className="px-2 py-2 text-center">
                    <span className="text-xs font-medium">
                      {beatmap.verifiedGameCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
