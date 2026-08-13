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
 * The flat shape the beatmap table renders. Both surfaces that use the table
 * adapt into it: the beatmap list, whose counts are global, and a tournament
 * pool, whose counts are scoped to that one tournament.
 */
export interface BeatmapTableRow {
  id: number;
  osuId: number;
  artist: string;
  title: string;
  diffName: string;
  /**
   * A name, never a player object: the row's link covers the whole identity
   * block, so a mapper link underneath it could not be clicked.
   */
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

/**
 * How often each pooled beatmap was played, and under which mods, in one pass
 * over the tournament's games. Resolving this per row instead rescans every
 * game once per beatmap, which a 1000-map pool feels.
 */
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
    // Games stand in for scores: the same aggregation the API runs for the
    // beatmap list, so both surfaces bucket and rank mods identically.
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
      // The pool is one tournament, so this column is hidden there; the field
      // still carries a truthful value rather than a placeholder.
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

/**
 * Client-side sorting, for the surfaces that hold the whole set in memory. The
 * beatmap list does not use it: there the server sorts every row, not the page.
 */
export function sortBeatmapTableRows(
  rows: BeatmapTableRow[],
  sort: BeatmapListSortKey,
  descending: boolean
): BeatmapTableRow[] {
  const valueOf = SORT_VALUE[sort];

  // Sorting is stable, so rows with equal values keep their source order.
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
