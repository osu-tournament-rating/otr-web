'use client';

import { useState, useMemo } from 'react';
import {
  BeatmapDTO,
  GameCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { getMostCommonModForBeatmap } from '@/lib/utils/mods';

export type SortField =
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

export type SortDirection = 'asc' | 'desc';

interface UseBeatmapSortOptions<T extends BeatmapDTO> {
  beatmaps: T[];
  tournamentGames?: GameCompactDTO[];
  initialSort?: SortField;
  initialDirection?: SortDirection;
}

interface UseBeatmapSortReturn<T extends BeatmapDTO> {
  sortedBeatmaps: T[];
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
}

const getSortValue = (
  beatmap: BeatmapDTO,
  field: SortField,
  tournamentGames: GameCompactDTO[] = []
): string | number => {
  switch (field) {
    case 'osuId':
      return beatmap.osuId;
    case 'title':
      return beatmap.beatmapset?.title?.toLowerCase() || '';
    case 'difficulty':
      return beatmap.diffName?.toLowerCase() || '';
    case 'sr':
      return beatmap.sr;
    case 'length':
      return beatmap.totalLength;
    case 'bpm':
      return beatmap.bpm || 0;
    case 'cs':
      return beatmap.cs || 0;
    case 'ar':
      return beatmap.ar || 0;
    case 'od':
      return beatmap.od || 0;
    case 'hp':
      return beatmap.hp || 0;
    case 'mod': {
      const modData = getMostCommonModForBeatmap(
        beatmap.osuId,
        tournamentGames
      );
      return modData?.mod ?? -1;
    }
    case 'gameCount': {
      const modData = getMostCommonModForBeatmap(
        beatmap.osuId,
        tournamentGames
      );
      return modData?.gameCount ?? 0;
    }
    case 'creator':
      return beatmap.beatmapset?.creator?.username?.toLowerCase() || '';
    default:
      return 0;
  }
};

export function useBeatmapSort<T extends BeatmapDTO>({
  beatmaps,
  tournamentGames = [],
  initialSort = 'gameCount',
  initialDirection = 'desc',
}: UseBeatmapSortOptions<T>): UseBeatmapSortReturn<T> {
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDirection);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to descending for star rating, ascending for others
      setSortDirection(
        field === 'sr' || field === 'gameCount' ? 'desc' : 'asc'
      );
    }
  };

  const sortedBeatmaps = useMemo(() => {
    return [...beatmaps].sort((a, b) => {
      const aValue = getSortValue(a, sortField, tournamentGames);
      const bValue = getSortValue(b, sortField, tournamentGames);

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [beatmaps, sortField, sortDirection, tournamentGames]);

  return {
    sortedBeatmaps,
    sortField,
    sortDirection,
    handleSort,
  };
}
