import type { BeatmapListSortKey } from '@/lib/beatmaps/list-params';
import { isDeletedTournamentBeatmap } from '@/lib/beatmaps/presentation';
import type {
  BeatmapListItem,
  BeatmapListTopMod,
} from '@/lib/orpc/schema/beatmapList';
import type {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';
import { calculateBeatmapListModDistribution } from '@/lib/utils/mods';
import type { Ruleset } from '@otr/core/osu';

/**
 * The flat shape the beatmap table renders: global counts from the beatmap list,
 * tournament-scoped counts from a pool.
 */
export interface BeatmapTableRow {
  id: number;
  osuId: number;
  artist: string;
  title: string;
  diffName: string;
  /** A name, never a player object; the row's link covers the whole identity block. */
  creator: string | null;
  beatmapsetOsuId: number | null;
  ruleset: Ruleset;
  sr: number;
  bpm: number;
  totalLength: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
  gameCount: number;
  tournamentCount: number;
  topMods: BeatmapListTopMod[];
  /** osu! no longer serves the beatmap. Only tournament pools track this. */
  isDeleted: boolean;
}

export function toBeatmapTableRows(
  beatmaps: BeatmapListItem[]
): BeatmapTableRow[] {
  return beatmaps.map((beatmap) => ({
    id: beatmap.id,
    osuId: beatmap.osuId,
    artist: beatmap.artist,
    title: beatmap.title,
    diffName: beatmap.diffName,
    creator: beatmap.creator,
    beatmapsetOsuId: beatmap.beatmapsetOsuId,
    ruleset: beatmap.ruleset,
    sr: beatmap.sr,
    bpm: beatmap.bpm,
    totalLength: beatmap.totalLength,
    cs: beatmap.cs,
    ar: beatmap.ar,
    od: beatmap.od,
    hp: beatmap.hp,
    gameCount: beatmap.verifiedGameCount,
    tournamentCount: beatmap.verifiedTournamentCount,
    topMods: beatmap.topMods ?? [],
    isDeleted: false,
  }));
}

interface TournamentBeatmapUsage {
  gameCount: number;
  topMods: BeatmapListTopMod[];
}

/** How often each pooled beatmap was played, and under which mods, in one pass over the games. */
function buildUsageIndex(
  games: TournamentMatchGame[]
): Map<number, TournamentBeatmapUsage> {
  const countsByBeatmap = new Map<number, Map<number, number>>();

  for (const game of games) {
    const osuId = game.beatmap?.osuId;
    if (osuId === undefined || osuId === null) continue;

    let counts = countsByBeatmap.get(osuId);
    if (!counts) {
      counts = new Map<number, number>();
      countsByBeatmap.set(osuId, counts);
    }
    counts.set(game.mods, (counts.get(game.mods) ?? 0) + 1);
  }

  const usage = new Map<number, TournamentBeatmapUsage>();

  for (const [osuId, counts] of countsByBeatmap) {
    // Games stand in for scores, matching the aggregation the beatmap list API runs.
    const rows = Array.from(counts, ([mods, scoreCount]) => ({
      mods,
      scoreCount,
    }));

    usage.set(osuId, {
      gameCount: rows.reduce((total, row) => total + row.scoreCount, 0),
      topMods: calculateBeatmapListModDistribution(rows).map(
        ({ label, mods, percentage }) => ({ mod: label, mods, percentage })
      ),
    });
  }

  return usage;
}

export function toTournamentBeatmapTableRows(
  beatmaps: TournamentBeatmap[],
  games: TournamentMatchGame[]
): BeatmapTableRow[] {
  const usage = buildUsageIndex(games);

  return beatmaps.map((beatmap) => {
    const played = usage.get(beatmap.osuId);
    const creator = beatmap.creators[0] ?? beatmap.beatmapset?.creator;

    return {
      id: beatmap.id,
      osuId: beatmap.osuId,
      artist: beatmap.beatmapset?.artist || 'Unknown artist',
      title: beatmap.beatmapset?.title || 'Unknown title',
      diffName: beatmap.diffName || 'Unknown difficulty',
      creator: creator?.username ?? null,
      beatmapsetOsuId: beatmap.beatmapset?.osuId ?? null,
      ruleset: beatmap.ruleset,
      sr: beatmap.sr,
      bpm: beatmap.bpm,
      totalLength: beatmap.totalLength,
      cs: beatmap.cs,
      ar: beatmap.ar,
      od: beatmap.od,
      hp: beatmap.hp,
      gameCount: played?.gameCount ?? 0,
      tournamentCount: 1,
      topMods: played?.topMods ?? [],
      isDeleted: isDeletedTournamentBeatmap(beatmap),
    };
  });
}

const SORT_VALUE: Record<
  BeatmapListSortKey,
  (row: BeatmapTableRow) => number | string
> = {
  sr: (row) => row.sr,
  bpm: (row) => row.bpm,
  cs: (row) => row.cs,
  ar: (row) => row.ar,
  od: (row) => row.od,
  hp: (row) => row.hp,
  length: (row) => row.totalLength,
  gameCount: (row) => row.gameCount,
  tournamentCount: (row) => row.tournamentCount,
  creator: (row) => row.creator ?? '',
};

/** Client-side sorting, for the surfaces holding the whole set in memory. */
export function sortBeatmapTableRows(
  rows: BeatmapTableRow[],
  sort: BeatmapListSortKey,
  descending: boolean
): BeatmapTableRow[] {
  const valueOf = SORT_VALUE[sort];

  return [...rows].sort((left, right) => {
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    const order =
      typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);

    return descending ? -order : order;
  });
}
