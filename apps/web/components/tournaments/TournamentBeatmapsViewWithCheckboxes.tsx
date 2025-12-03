'use client';

import {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';
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
import { memo, useCallback } from 'react';
import BeatmapBackground from '../games/BeatmapBackground';
import { Checkbox } from '@/components/ui/checkbox';
import { useBeatmapSort, type SortField } from '@/lib/hooks/useBeatmapSort';

interface ExtendedBeatmapDTO extends TournamentBeatmap {
  isSelected: boolean;
  isDeleted?: boolean;
}

interface TournamentBeatmapsViewWithCheckboxesProps {
  beatmaps: ExtendedBeatmapDTO[];
  tournamentGames?: TournamentMatchGame[];
  onSelectBeatmap: (beatmapId: number, checked: boolean) => void;
}

const COLUMN_WIDTHS = {
  checkbox: 'w-[4%]',
  osuId: 'w-[6%]',
  beatmap: 'w-[9%]',
  difficulty: 'w-[9%]',
  sr: 'w-[7%]',
  length: 'w-[7%]',
  bpm: 'w-[7%]',
  cs: 'w-[3%]',
  ar: 'w-[3%]',
  od: 'w-[3%]',
  hp: 'w-[3%]',
  mod: 'w-[4%]',
  gameCount: 'w-[4%]',
  creator: 'w-[6%]',
} as const;

const SortButton = memo(
  ({
    field,
    children,
    sortField,
    sortDirection,
    onClick,
  }: {
    field: SortField;
    children: React.ReactNode;
    sortField: SortField;
    sortDirection: 'asc' | 'desc';
    onClick: (field: SortField) => void;
  }) => (
    <button
      onClick={() => onClick(field)}
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
  )
);
SortButton.displayName = 'SortButton';

const BeatmapRow = memo(
  ({
    beatmap,
    modData,
    onSelectBeatmap,
  }: {
    beatmap: ExtendedBeatmapDTO;
    modData: ReturnType<typeof getMostCommonModForBeatmap>;
    onSelectBeatmap: (beatmapId: number, checked: boolean) => void;
  }) => {
    const handleCheckboxChange = useCallback(
      (checked: boolean | 'indeterminate') => {
        onSelectBeatmap(beatmap.id, checked as boolean);
      },
      [beatmap.id, onSelectBeatmap]
    );

    return (
      <tr
        className={`group transition-colors ${
          beatmap.isDeleted
            ? 'bg-destructive/5 hover:bg-destructive/10'
            : 'hover:bg-muted/30'
        }`}
      >
        {/* Checkbox */}
        <td className="px-2 py-2 text-center">
          <Checkbox
            checked={beatmap.isSelected}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Select ${beatmap.beatmapset?.title || 'beatmap'}`}
          />
        </td>

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
            <span className="text-xs font-medium">{beatmap.sr.toFixed(2)}</span>
          </div>
        </td>

        {/* Length */}
        <td className="px-2 py-2 text-center">
          <span className="text-xs">{formatDuration(beatmap.totalLength)}</span>
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
              <span className="text-muted-foreground text-xs">N/A</span>
            )}
          </div>
        </td>

        {/* Game Count */}
        <td className="px-2 py-2 text-center">
          <span className="text-xs font-medium">{modData?.gameCount ?? 0}</span>
        </td>

        {/* Creator */}
        <td className="px-2 py-2 text-center">
          <div className="flex items-center">
            {(() => {
              const creator =
                beatmap.creators?.[0] ?? beatmap.beatmapset?.creator;
              return creator ? (
                <Link
                  href={`/players/${creator.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary flex max-w-[120px] items-center gap-1 text-xs transition-colors"
                >
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{creator.username}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground text-xs">Unknown</span>
              );
            })()}
          </div>
        </td>
      </tr>
    );
  }
);
BeatmapRow.displayName = 'BeatmapRow';

export default function TournamentBeatmapsViewWithCheckboxes({
  beatmaps,
  tournamentGames = [],
  onSelectBeatmap,
}: TournamentBeatmapsViewWithCheckboxesProps) {
  const { sortedBeatmaps, sortField, sortDirection, handleSort } =
    useBeatmapSort({
      beatmaps,
      tournamentGames,
    });

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
                <th className={`${COLUMN_WIDTHS.checkbox} px-2 py-2`}>
                  {/* Checkbox column header - empty */}
                </th>
                <th
                  className={`${COLUMN_WIDTHS.osuId} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SortButton
                    field="osuId"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onClick={handleSort}
                  >
                    <span className="whitespace-nowrap">osu! ID</span>
                  </SortButton>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.beatmap} text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider`}
                >
                  <SortButton
                    field="title"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onClick={handleSort}
                  >
                    Beatmap
                  </SortButton>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.difficulty} text-muted-foreground px-2 py-2 text-left text-xs font-medium tracking-wider`}
                >
                  <SortButton
                    field="difficulty"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onClick={handleSort}
                  >
                    Difficulty
                  </SortButton>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.sr} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Star Rating">
                    <div className="flex justify-center">
                      <SortButton
                        field="sr"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onClick={handleSort}
                      >
                        <Star className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.length} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Length">
                    <div className="flex justify-center">
                      <SortButton
                        field="length"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onClick={handleSort}
                      >
                        <Clock className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.bpm} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="BPM">
                    <div className="flex justify-center">
                      <SortButton
                        field="bpm"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onClick={handleSort}
                      >
                        <Activity className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.cs} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Circle Size">
                    <SortButton
                      field="cs"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onClick={handleSort}
                    >
                      CS
                    </SortButton>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.ar} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Approach Rate">
                    <SortButton
                      field="ar"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onClick={handleSort}
                    >
                      AR
                    </SortButton>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.od} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Overall Difficulty">
                    <SortButton
                      field="od"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onClick={handleSort}
                    >
                      OD
                    </SortButton>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.hp} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="HP Drain Rate">
                    <SortButton
                      field="hp"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onClick={handleSort}
                    >
                      HP
                    </SortButton>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.mod} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Most Common Mod">
                    <SortButton
                      field="mod"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onClick={handleSort}
                    >
                      Mod
                    </SortButton>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.gameCount} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SimpleTooltip content="Number of Games">
                    <div className="flex justify-center">
                      <SortButton
                        field="gameCount"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onClick={handleSort}
                      >
                        <Gamepad2 className="h-3 w-3" />
                      </SortButton>
                    </div>
                  </SimpleTooltip>
                </th>
                <th
                  className={`${COLUMN_WIDTHS.creator} text-muted-foreground px-2 py-2 text-center text-xs font-medium tracking-wider`}
                >
                  <SortButton
                    field="creator"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onClick={handleSort}
                  >
                    Creator
                  </SortButton>
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
                  <BeatmapRow
                    key={beatmap.id}
                    beatmap={beatmap}
                    modData={modData}
                    onSelectBeatmap={onSelectBeatmap}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
