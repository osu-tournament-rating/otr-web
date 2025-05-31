'use client';

import { BeatmapDTO } from '@osu-tournament-rating/otr-api-client';
import {
  Music,
  Star,
  Clock,
  Activity,
  User,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils/date';
import Link from 'next/link';
import SimpleTooltip from '@/components/simple-tooltip';
import Image from 'next/image';
import { useState, useMemo } from 'react';

interface TournamentBeatmapsViewProps {
  beatmaps: BeatmapDTO[];
}

type SortField = 'title' | 'sr' | 'length' | 'bpm';
type SortDirection = 'asc' | 'desc';

export default function TournamentBeatmapsView({
  beatmaps,
}: TournamentBeatmapsViewProps) {
  const [sortField, setSortField] = useState<SortField>('sr');
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
    return [...beatmaps].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'title':
          aValue = a.beatmapset?.title?.toLowerCase() || '';
          bValue = b.beatmapset?.title?.toLowerCase() || '';
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
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [beatmaps, sortField, sortDirection]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 transition-colors hover:text-foreground"
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
        <Music className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No Beatmaps Found
        </h3>
        <p className="text-sm text-muted-foreground">
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
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-[10%] px-2 py-2 text-left text-xs font-medium tracking-wider text-muted-foreground">
                  <SortButton field="title">Beatmap</SortButton>
                </th>
                <th className="w-[10%] px-2 py-2 text-left text-xs font-medium tracking-wider text-muted-foreground">
                  Difficulty
                </th>
                <th className="w-[8%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="Star Rating">
                    <div className="flex justify-center">
                      <SortButton field="sr">
                        <Star className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="w-[8%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="Length">
                    <div className="flex justify-center">
                      <SortButton field="length">
                        <Clock className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="w-[8%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="BPM">
                    <div className="flex justify-center">
                      <SortButton field="bpm">
                        <Activity className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th className="w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="Circle Size">
                    <p>CS</p>
                  </SimpleTooltip>
                </th>
                <th className="w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="Approach Rate">
                    <p>AR</p>
                  </SimpleTooltip>
                </th>
                <th className="w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="Overall Difficulty">
                    <p>OD</p>
                  </SimpleTooltip>
                </th>
                <th className="w-[3%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  <SimpleTooltip content="HP Drain Rate">
                    <p>HP</p>
                  </SimpleTooltip>
                </th>
                <th className="w-[7%] px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground">
                  Creator
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-border">
              {sortedBeatmaps.map((beatmap) => (
                <tr
                  key={beatmap.id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  {/* Beatmap Info */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {/* Thumbnail */}
                      <div className="relative h-8 w-12 flex-shrink-0 overflow-hidden rounded">
                        {beatmap.beatmapset?.osuId ? (
                          <Image
                            src={`https://assets.ppy.sh/beatmaps/${beatmap.beatmapset.osuId}/covers/list@2x.jpg`}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Music className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Song details */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`https://osu.ppy.sh/b/${beatmap.osuId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block transition-colors hover:text-primary"
                        >
                          <p className="max-w-[160px] truncate text-xs font-medium">
                            {beatmap.beatmapset?.title || 'Unknown Title'}
                          </p>
                          <p className="max-w-[140px] truncate text-xs text-muted-foreground">
                            by {beatmap.beatmapset?.artist || 'Unknown Artist'}
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

                  {/* Creator */}
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center">
                      {beatmap.beatmapset?.creator ? (
                        <Link
                          href={`https://osu.ppy.sh/users/${beatmap.beatmapset.creator.osuId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex max-w-[120px] items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                        >
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {beatmap.beatmapset.creator.username}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unknown
                        </span>
                      )}
                    </div>
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
