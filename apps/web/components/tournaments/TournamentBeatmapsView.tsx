'use client';

import {
  Music,
  Star,
  Clock,
  Activity,
  User,
  ChevronUp,
  ChevronDown,
  Gamepad2,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils/date';
import { getMostCommonModForBeatmap } from '@/lib/utils/mods';
import Link from 'next/link';
import SimpleTooltip from '@/components/simple-tooltip';
import SingleModIcon from '@/components/icons/SingleModIcon';
import { useState, useMemo } from 'react';
import BeatmapBackground from '../games/BeatmapBackground';
import {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';

interface TournamentBeatmapsViewProps {
  beatmaps: TournamentBeatmap[];
  tournamentGames?: TournamentMatchGame[];
}

type SortField =
  | 'osuId'
  | 'title'
  | 'difficulty'
  | 'sr'
  | 'length'
  | 'bpm'
  | 'cs'
  | 'ar'
  | 'od'
  | 'hp'
  | 'mod'
  | 'gameCount'
  | 'creator';
type SortDirection = 'asc' | 'desc';

export default function TournamentBeatmapsView({
  beatmaps,
  tournamentGames = [],
}: TournamentBeatmapsViewProps) {
  const [sortField, setSortField] = useState<SortField>('gameCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'sr' ? 'desc' : 'asc');
    }
  };

  const sortedBeatmaps = useMemo(() => {
    return [...beatmaps]
      .filter((beatmap) => {
        const artist = beatmap.beatmapset?.artist || 'Unknown Artist';
        const title = beatmap.beatmapset?.title || 'Unknown Title';
        return !(artist === 'Unknown Artist' && title === 'Unknown Title');
      })
      .sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case 'osuId':
            aValue = a.osuId;
            bValue = b.osuId;
            break;
          case 'title':
            aValue = a.beatmapset?.title?.toLowerCase() || '';
            bValue = b.beatmapset?.title?.toLowerCase() || '';
            break;
          case 'difficulty':
            aValue = a.diffName?.toLowerCase() || '';
            bValue = b.diffName?.toLowerCase() || '';
            break;
          case 'sr':
            aValue = a.sr;
            bValue = b.sr;
            break;
          case 'length':
            aValue = a.totalLength;
            bValue = b.totalLength;
            break;
          case 'bpm':
            aValue = a.bpm || 0;
            bValue = b.bpm || 0;
            break;
          case 'cs':
            aValue = a.cs || 0;
            bValue = b.cs || 0;
            break;
          case 'ar':
            aValue = a.ar || 0;
            bValue = b.ar || 0;
            break;
          case 'od':
            aValue = a.od || 0;
            bValue = b.od || 0;
            break;
          case 'hp':
            aValue = a.hp || 0;
            bValue = b.hp || 0;
            break;
          case 'mod':
            {
              const aModData = getMostCommonModForBeatmap(
                a.osuId,
                tournamentGames
              );
              const bModData = getMostCommonModForBeatmap(
                b.osuId,
                tournamentGames
              );
              aValue = aModData?.mod ?? -1;
              bValue = bModData?.mod ?? -1;
            }
            break;
          case 'gameCount':
            {
              const aModData = getMostCommonModForBeatmap(
                a.osuId,
                tournamentGames
              );
              const bModData = getMostCommonModForBeatmap(
                b.osuId,
                tournamentGames
              );
              aValue = aModData?.gameCount ?? 0;
              bValue = bModData?.gameCount ?? 0;
            }
            break;
          case 'creator':
            aValue = a.beatmapset?.creator?.username?.toLowerCase() || '';
            bValue = b.beatmapset?.creator?.username?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [beatmaps, sortField, sortDirection, tournamentGames]);

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
      {sortField === field &&
        (sortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
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
          This tournament has no pooled beatmaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Header */}
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-muted-foreground w-[6%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SortButton field="osuId">
                    <span className="whitespace-nowrap">osu! ID</span>
                  </SortButton>
                </th>
                <th className="text-muted-foreground w-[9%] px-2 py-2 text-left text-xs font-medium tracking-wider">
                  <SortButton field="title">Beatmap</SortButton>
                </th>
                <th className="text-muted-foreground w-[9%] px-2 py-2 text-left text-xs font-medium tracking-wider">
                  <SortButton field="difficulty">Difficulty</SortButton>
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
                  <SimpleTooltip content="Length">
                    <div className="flex justify-center">
                      <SortButton field="length">
                        <Clock className="h-3 w-3" />
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
                <th className="text-muted-foreground w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Circle Size">
                    <SortButton field="cs">CS</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Approach Rate">
                    <SortButton field="ar">AR</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Overall Difficulty">
                    <SortButton field="od">OD</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="HP Drain Rate">
                    <SortButton field="hp">HP</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[4%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Most Common Mod">
                    <SortButton field="mod">Mod</SortButton>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[4%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SimpleTooltip content="Number of Games">
                    <div className="flex justify-center">
                      <SortButton field="gameCount">
                        <Gamepad2 className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="text-muted-foreground w-[6%] px-2 py-2 text-center text-xs font-medium tracking-wider">
                  <SortButton field="creator">Creator</SortButton>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-border divide-y">
              {sortedBeatmaps.map((beatmap) => {
                const modData = getMostCommonModForBeatmap(
                  beatmap.osuId,
                  tournamentGames
                );

                return (
                  <tr
                    key={beatmap.id}
                    className="hover:bg-muted/30 group transition-colors"
                  >
                    {/* osu! ID */}
                    <td className="px-2 py-2 text-center">
                      <Link
                        href={`/beatmaps/${beatmap.osuId}`}
                        className="text-muted-foreground hover:text-primary text-xs transition-colors"
                      >
                        {beatmap.osuId}
                      </Link>
                    </td>

                    {/* Beatmap Info */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {/* Thumbnail */}
                        <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded">
                          {beatmap.beatmapset?.osuId ? (
                            <BeatmapBackground
                              beatmapsetId={beatmap.beatmapset?.osuId}
                              alt={`${beatmap.beatmapset?.title} cover`}
                            />
                          ) : (
                            <div className="bg-muted flex h-full w-full items-center justify-center">
                              <Music className="text-muted-foreground h-3 w-3" />
                            </div>
                          )}
                        </div>

                        {/* Song details */}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/beatmaps/${beatmap.osuId}`}
                            className="hover:text-primary block transition-colors"
                          >
                            <p className="max-w-[160px] truncate text-xs font-medium">
                              {beatmap.beatmapset?.title || 'Unknown Title'}
                            </p>
                            <p className="text-muted-foreground max-w-[140px] truncate text-xs">
                              by{' '}
                              {beatmap.beatmapset?.artist || 'Unknown Artist'}
                            </p>
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="px-2 py-2">
                      <span className="block max-w-[100px] truncate text-xs font-medium">
                        {beatmap.diffName || 'Unknown'}
                      </span>
                    </td>

                    {/* Star Rating */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-medium">
                          {beatmap.sr.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Length */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">
                        {formatDuration(beatmap.totalLength)}
                      </span>
                    </td>

                    {/* BPM */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">
                        {beatmap.bpm ? Math.round(beatmap.bpm) : 'N/A'}
                      </span>
                    </td>

                    {/* CS */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">{beatmap.cs}</span>
                    </td>

                    {/* AR */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">{beatmap.ar}</span>
                    </td>

                    {/* OD */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">{beatmap.od}</span>
                    </td>

                    {/* HP */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs">
                        {beatmap.hp !== undefined ? beatmap.hp : 'N/A'}
                      </span>
                    </td>

                    {/* Most Common Mod */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center">
                        {modData ? (
                          <SingleModIcon mods={modData.mod} size={28} />
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            N/A
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Game Count */}
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs font-medium">
                        {modData?.gameCount ?? 0}
                      </span>
                    </td>

                    {/* Creator */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center">
                        {beatmap.beatmapset?.creator ? (
                          <Link
                            href={`https://osu.ppy.sh/users/${beatmap.beatmapset.creator.osuId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary flex max-w-[120px] items-center gap-1 text-xs transition-colors"
                          >
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {beatmap.beatmapset.creator.username}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Unknown
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
