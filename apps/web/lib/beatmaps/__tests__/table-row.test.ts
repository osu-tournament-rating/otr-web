import { describe, expect, test } from 'bun:test';
import { Mods, Ruleset } from '@otr/core/osu';

import { toTournamentBeatmapTableRows } from '../table-row';
import type {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';
import {
  calculateBeatmapListModDistribution,
  filterBeatmapModDistribution,
} from '@/lib/utils/mods';

const beatmap = (topMods: TournamentBeatmap['topMods']) =>
  ({
    id: 1,
    osuId: 1001,
    ruleset: Ruleset.Osu,
    diffName: 'Extra',
    totalLength: 200,
    bpm: 180,
    cs: 4,
    ar: 9,
    od: 8,
    hp: 5,
    sr: 6,
    beatmapset: null,
    creators: [],
    attributes: [],
    dataFetchStatus: 0,
    topMods,
  }) as unknown as TournamentBeatmap;

const game = (mods: number, osuId: number | null = 1001) =>
  ({
    id: 1,
    mods,
    beatmap: osuId === null ? null : { osuId },
  }) as unknown as TournamentMatchGame;

describe('toTournamentBeatmapTableRows', () => {
  test('shows the per-score mods of a freemod pick', () => {
    const topMods = filterBeatmapModDistribution(
      calculateBeatmapListModDistribution([
        { mods: Mods.Hidden, scoreCount: 4 },
        { mods: Mods.HardRock, scoreCount: 3 },
        { mods: Mods.DoubleTime, scoreCount: 1 },
      ])
    ).map(({ label, mods, percentage }) => ({ mod: label, mods, percentage }));

    const [row] = toTournamentBeatmapTableRows(
      [beatmap(topMods)],
      [game(Mods.None), game(Mods.None)]
    );

    expect(row.topMods).toEqual(topMods);
    expect(row.gameCount).toBe(2);
    expect(row.tournamentCount).toBe(1);
  });

  test('counts only the games played on the pooled beatmap', () => {
    const [row] = toTournamentBeatmapTableRows(
      [beatmap([])],
      [game(Mods.None), game(Mods.Hidden, 2002), game(Mods.None, null)]
    );

    expect(row.gameCount).toBe(1);
  });

  test('falls back to no mods when the pool carries none', () => {
    const [row] = toTournamentBeatmapTableRows([beatmap([])], []);

    expect(row.topMods).toEqual([]);
    expect(row.gameCount).toBe(0);
  });
});
