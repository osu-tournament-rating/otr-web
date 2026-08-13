import { describe, expect, it } from 'bun:test';

import { Ruleset } from '@otr/core/osu';

import {
  CLOSENESS_MIN_GAMES,
  CLOSENESS_MIN_RELIABILITY,
  lookupBaseline,
  normalCdf,
  summarizeCloseness,
  type ClosenessGame,
} from '@/lib/beatmaps/closeness';
import { CORPUS_GAMES } from '@/lib/beatmaps/closeness-baselines';

const OSU_1V1 = lookupBaseline(Ruleset.Osu, 1);
const MANIA_4K_3V3 = lookupBaseline(Ruleset.Mania4k, 3);

/** A game standing exactly `z` standard deviations off its cohort baseline. */
function gameAtZ(ruleset: Ruleset, teamSize: number, z: number): ClosenessGame {
  const baseline = lookupBaseline(ruleset, teamSize);
  return {
    ruleset,
    teamSize,
    logRatio: baseline.meanLogRatio + z * baseline.sdLogRatio,
  };
}

interface CohortFixture {
  ruleset: Ruleset;
  teamSize: number;
  logRatios: number[];
}

function expandFixture(fixture: readonly CohortFixture[]): ClosenessGame[] {
  return fixture.flatMap(({ ruleset, teamSize, logRatios }) =>
    logRatios.map((logRatio) => ({ ruleset, teamSize, logRatio }))
  );
}

describe('normalCdf', () => {
  it('matches reference values within the approximation error', () => {
    const references: [number, number][] = [
      [-2.5, 0.006209665325776132],
      [-1, 0.15865525393145707],
      [0, 0.5],
      [1.96, 0.9750021048517795],
      [3, 0.9986501019683699],
    ];

    for (const [z, expected] of references) {
      // Abramowitz-Stegun 7.1.26 is specified to |error| <= 1.5e-7.
      expect(Math.abs(normalCdf(z) - expected)).toBeLessThan(1.5e-7);
    }
  });

  it('stays inside [0, 1] far out in both tails', () => {
    expect(normalCdf(-40)).toBe(0);
    expect(normalCdf(40)).toBe(1);
  });
});

describe('lookupBaseline', () => {
  it('resolves a fitted cell to its own cohort row', () => {
    expect(OSU_1V1.scope).toBe('cohort');
    expect(OSU_1V1.ruleset).toBe(Ruleset.Osu);
    expect(OSU_1V1.teamSize).toBe(1);
    expect(OSU_1V1.gameCount).toBe(344814);
  });

  it('falls back to the ruleset row for mania 7K 3v3', () => {
    // 214 games at the 2026-08-12 fit, under the 1000-game floor.
    const baseline = lookupBaseline(Ruleset.Mania7k, 3);

    expect(baseline.scope).toBe('ruleset');
    expect(baseline.ruleset).toBe(Ruleset.Mania7k);
    expect(baseline.teamSize).toBeNull();
    expect(baseline.gameCount).toBe(8737);
  });

  it('falls back to global for a ruleset with no fitted games', () => {
    const baseline = lookupBaseline(Ruleset.ManiaOther, 1);

    expect(baseline.scope).toBe('global');
    expect(baseline.ruleset).toBeNull();
    expect(baseline.gameCount).toBe(CORPUS_GAMES);
  });

  it('standardizes against whichever row the fallback chain reached', () => {
    const baseline = lookupBaseline(Ruleset.Mania7k, 3);
    const summary = summarizeCloseness(
      [{ ruleset: Ruleset.Mania7k, teamSize: 3, logRatio: 0.2 }],
      0
    );

    expect(summary.cohort?.baselineScope).toBe('ruleset');
    expect(summary.games[0].z).toBeCloseTo(
      (0.2 - baseline.meanLogRatio) / baseline.sdLogRatio,
      12
    );
  });
});

describe('summarizeCloseness shrinkage', () => {
  it('pulls a six-game map back toward its cohort baseline', () => {
    const zValues = [1.2, -0.4, 0.6, 0.1, -1.1, 0.8];
    const summary = summarizeCloseness(
      zValues.map((z) => gameAtZ(Ruleset.Osu, 1, z)),
      0
    );

    const meanZ = zValues.reduce((total, z) => total + z, 0) / zValues.length;
    const reliability = 6 / (6 + OSU_1V1.shrinkageK);

    expect(summary.gameCount).toBe(6);
    expect(summary.meanZ).toBeCloseTo(meanZ, 12);
    expect(summary.reliability).toBeCloseTo(reliability, 12);
    expect(summary.shrunkZ).toBeCloseTo(reliability * meanZ, 12);
  });
});

describe('summarizeCloseness reliability gate', () => {
  it('withholds a verdict from ten osu! 1v1 games', () => {
    const summary = summarizeCloseness(
      Array.from({ length: 10 }, () => gameAtZ(Ruleset.Osu, 1, 0.5)),
      0
    );
    const reliability = summary.reliability ?? 0;

    expect(reliability).toBeCloseTo(10 / (10 + OSU_1V1.shrinkageK), 12);
    expect(reliability).toBeLessThan(CLOSENESS_MIN_RELIABILITY);
    expect(summary.percentile).toBeNull();
    expect(summary.percentileInterval).toBeNull();
    // The gate covers the verdict, not the distribution.
    expect(summary.bins.reduce((total, count) => total + count, 0)).toBe(10);
  });

  it('states a verdict at eleven osu! 1v1 games', () => {
    const summary = summarizeCloseness(
      Array.from({ length: 11 }, () => gameAtZ(Ruleset.Osu, 1, 0.5)),
      0
    );
    const reliability = summary.reliability ?? 0;

    expect(reliability).toBeCloseTo(11 / (11 + OSU_1V1.shrinkageK), 12);
    expect(reliability).toBeGreaterThanOrEqual(CLOSENESS_MIN_RELIABILITY);
    expect(summary.percentile).toBeCloseTo(80.7, 1);
    expect(summary.percentileInterval?.[0]).toBeCloseTo(48.6, 1);
    expect(summary.percentileInterval?.[1]).toBeCloseTo(96.1, 1);
  });

  it('states a verdict at ten mania 4K 3v3 games, where k is far smaller', () => {
    const summary = summarizeCloseness(
      Array.from({ length: 10 }, () => gameAtZ(Ruleset.Mania4k, 3, -0.5)),
      0
    );
    const reliability = summary.reliability ?? 0;

    expect(reliability).toBeCloseTo(10 / (10 + MANIA_4K_3V3.shrinkageK), 12);
    expect(reliability).toBeGreaterThanOrEqual(CLOSENESS_MIN_RELIABILITY);
    expect(summary.percentile).toBeCloseTo(23.5, 1);
  });
});

describe('summarizeCloseness pooling across cohorts', () => {
  it('pools two cohorts through the standardized scale', () => {
    // Eight osu! 1v1 games and two mania 4K 3v3 games, placed at exact z.
    const zOsu = [1, 1, 0, 0, -1, -1, 0.5, 0.5];
    const zMania = [2, -1];
    const summary = summarizeCloseness(
      [
        ...zOsu.map((z) => gameAtZ(Ruleset.Osu, 1, z)),
        ...zMania.map((z) => gameAtZ(Ruleset.Mania4k, 3, z)),
      ],
      3
    );

    // Hand-computed from the two baselines, n-weighted 8:2.
    const meanZ = (1 + 1 + 0 + 0 - 1 - 1 + 0.5 + 0.5 + 2 - 1) / 10;
    const shrinkageK =
      (8 * OSU_1V1.shrinkageK + 2 * MANIA_4K_3V3.shrinkageK) / 10;
    const icc = (8 * OSU_1V1.icc + 2 * MANIA_4K_3V3.icc) / 10;
    const reliability = 10 / (10 + shrinkageK);
    const shrunkZ = reliability * meanZ;
    const tauZ = Math.sqrt(icc);
    const halfWidth = 1.2816 * tauZ * Math.sqrt(shrinkageK / (10 + shrinkageK));

    expect(meanZ).toBe(0.2);
    expect(summary.meanZ).toBeCloseTo(meanZ, 12);
    expect(summary.reliability).toBeCloseTo(reliability, 12);
    expect(summary.shrunkZ).toBeCloseTo(shrunkZ, 12);
    expect(summary.percentile).toBeCloseTo(normalCdf(shrunkZ / tauZ) * 100, 10);
    expect(summary.percentileInterval?.[0]).toBeCloseTo(
      normalCdf((shrunkZ - halfWidth) / tauZ) * 100,
      10
    );
    expect(summary.percentileInterval?.[1]).toBeCloseTo(
      normalCdf((shrunkZ + halfWidth) / tauZ) * 100,
      10
    );
    expect(summary.excludedUnverifiedGameCount).toBe(3);

    // The 8:2 split makes osu! 1v1 dominant, so its edges bin every game.
    expect(summary.cohort).toEqual({
      ruleset: Ruleset.Osu,
      teamSize: 1,
      baselineScope: 'cohort',
      meanLogRatio: OSU_1V1.meanLogRatio,
      sdLogRatio: OSU_1V1.sdLogRatio,
    });
    expect(summary.bins).toEqual([3, 0, 0, 0, 0, 0, 2, 2, 2, 1]);
  });

  it('pins beatmap 26459 across three mania 4K team sizes', () => {
    const summary = summarizeCloseness(expandFixture(BEATMAP_26459), 0);

    expect(summary.gameCount).toBe(101);
    // beatmaps.ruleset stores 3 (ManiaOther) for this map; every game is 4.
    expect(summary.cohort?.ruleset).toBe(Ruleset.Mania4k);
    expect(summary.cohort?.teamSize).toBe(1);
    expect(summary.cohort?.baselineScope).toBe('cohort');
    expect(summary.reliability).toBeCloseTo(0.9602, 3);
    expect(summary.percentile).toBeCloseTo(45.4, 1);
  });

  it('pins beatmap 4722 across five osu! team sizes', () => {
    const summary = summarizeCloseness(expandFixture(BEATMAP_4722), 0);

    expect(summary.gameCount).toBe(377);
    expect(summary.cohort?.ruleset).toBe(Ruleset.Osu);
    expect(summary.cohort?.teamSize).toBe(1);
    expect(summary.cohort?.baselineScope).toBe('cohort');
    expect(summary.reliability).toBeCloseTo(0.9733, 3);
    expect(summary.percentile).toBeCloseTo(44.1, 1);
  });
});

describe('summarizeCloseness degenerate inputs', () => {
  it('returns an all-null summary with no games', () => {
    expect(summarizeCloseness([], 12)).toEqual({
      gameCount: 0,
      excludedUnverifiedGameCount: 12,
      cohort: null,
      reliability: null,
      meanZ: null,
      shrunkZ: null,
      percentile: null,
      percentileInterval: null,
      bins: [],
      baselineZDeciles: null,
      games: [],
    });
  });

  it('leaves the bins empty below the minimum game count', () => {
    const games = Array.from({ length: CLOSENESS_MIN_GAMES - 1 }, () =>
      gameAtZ(Ruleset.Mania4k, 3, -0.5)
    );
    const summary = summarizeCloseness(games, 0);
    const reliability = summary.reliability ?? 0;

    // Reliable enough on its own, but nine games is still below the floor.
    expect(reliability).toBeGreaterThanOrEqual(CLOSENESS_MIN_RELIABILITY);
    expect(summary.bins).toEqual([]);
    expect(summary.percentile).toBeNull();
    expect(summary.percentileInterval).toBeNull();
    // Everything the sparse state renders is still there.
    expect(summary.games).toHaveLength(9);
    expect(summary.baselineZDeciles).toEqual(MANIA_4K_3V3.zDecileEdges);
  });
});

/**
 * Real per-game log ratios for the two maps the design audit pinned, read from
 * the production replica on 2026-08-12 and rounded to six decimals.
 */
const BEATMAP_26459: CohortFixture[] = [
  {
    ruleset: Ruleset.Mania4k,
    teamSize: 1,
    logRatios: [
      0.000253, 0.000344, 0.000346, 0.000932, 0.001144, 0.001416, 0.001431,
      0.001575, 0.00255, 0.002642, 0.002864, 0.002913, 0.003276, 0.003424,
      0.003456, 0.003633, 0.003706, 0.004244, 0.004674, 0.004875, 0.006227,
      0.009044, 0.009925, 0.010377, 0.01057, 0.010912, 0.011182, 0.011422,
      0.012606, 0.01274, 0.013335, 0.014361, 0.014819, 0.015464, 0.015663,
      0.0157, 0.01747, 0.01781, 0.01976, 0.020712, 0.020752, 0.023345, 0.024697,
      0.024802, 0.024865, 0.025684, 0.03999, 0.040195, 0.040196, 0.0409,
      0.041568, 0.042, 0.042974, 0.046695, 0.046733, 0.04829, 0.048739,
      0.053069, 0.054147, 0.054705, 0.056846, 0.074671, 0.097176, 0.100067,
      0.128203, 0.131564, 1.230125,
    ],
  },
  {
    ruleset: Ruleset.Mania4k,
    teamSize: 2,
    logRatios: [0.006241, 0.020688, 0.036839, 0.076624, 0.108044],
  },
  {
    ruleset: Ruleset.Mania4k,
    teamSize: 3,
    logRatios: [
      0.000481, 0.000593, 0.000866, 0.000925, 0.001221, 0.001427, 0.001474,
      0.001965, 0.002399, 0.002763, 0.004012, 0.004045, 0.004983, 0.005602,
      0.006464, 0.00664, 0.006672, 0.007599, 0.008262, 0.008723, 0.009311,
      0.009476, 0.010277, 0.012843, 0.015062, 0.018654, 0.020099, 0.023573,
      0.050014,
    ],
  },
];

const BEATMAP_4722: CohortFixture[] = [
  {
    ruleset: Ruleset.Osu,
    teamSize: 1,
    logRatios: [
      0.000109, 0.004384, 0.006646, 0.007532, 0.012236, 0.013209, 0.016208,
      0.018865, 0.020422, 0.021543, 0.025865, 0.025994, 0.028868, 0.032023,
      0.034804, 0.038648, 0.041612, 0.045916, 0.048063, 0.059595, 0.062592,
      0.063443, 0.064483, 0.065418, 0.066085, 0.067931, 0.069422, 0.070299,
      0.070685, 0.0748, 0.080228, 0.089153, 0.096413, 0.096417, 0.100116,
      0.103668, 0.10635, 0.114399, 0.11906, 0.120884, 0.125369, 0.125848,
      0.127608, 0.129811, 0.132325, 0.143669, 0.147574, 0.155094, 0.158501,
      0.171263, 0.189854, 0.209525, 0.210939, 0.21251, 0.216744, 0.235468,
      0.240873, 0.243464, 0.243593, 0.250737, 0.257307, 0.25749, 0.260034,
      0.262204, 0.262447, 0.268957, 0.272569, 0.285663, 0.296171, 0.30336,
      0.325415, 0.329722, 0.334129, 0.335316, 0.335712, 0.339479, 0.345412,
      0.34559, 0.351577, 0.352274, 0.354767, 0.359457, 0.363847, 0.367419,
      0.368763, 0.37177, 0.373626, 0.375423, 0.38186, 0.38234, 0.382777,
      0.389084, 0.404377, 0.41583, 0.41842, 0.419361, 0.425254, 0.425264,
      0.429097, 0.438629, 0.441485, 0.441835, 0.447452, 0.459474, 0.463514,
      0.467902, 0.487428, 0.491239, 0.506493, 0.51592, 0.529421, 0.541784,
      0.543781, 0.55126, 0.558147, 0.55918, 0.562124, 0.571115, 0.573247,
      0.574451, 0.576851, 0.595521, 0.605825, 0.608113, 0.614378, 0.626539,
      0.628674, 0.640114, 0.645355, 0.659227, 0.669662, 0.683998, 0.687324,
      0.693693, 0.695578, 0.698147, 0.707369, 0.713264, 0.721941, 0.729645,
      0.750373, 0.758114, 0.766718, 0.780729, 0.784794, 0.814042, 0.817124,
      0.824283, 0.839773, 0.845932, 0.852941, 0.866095, 0.869495, 0.875275,
      0.884052, 0.884959, 0.893965, 0.908065, 0.920964, 0.924563, 0.934089,
      0.934878, 0.943354, 0.945941, 0.969617, 0.981318, 0.992641, 0.999958,
      1.022907, 1.05595, 1.060843, 1.069611, 1.078815, 1.158173, 1.172747,
      1.216335, 1.223576, 1.247101, 1.287995, 1.602706, 1.636321, 1.713733,
      1.793065, 1.845974, 1.96607,
    ],
  },
  {
    ruleset: Ruleset.Osu,
    teamSize: 2,
    logRatios: [
      0.003467, 0.00561, 0.006126, 0.015572, 0.016706, 0.018251, 0.018752,
      0.019004, 0.030052, 0.034972, 0.035466, 0.035638, 0.043526, 0.043669,
      0.045036, 0.045702, 0.047192, 0.04971, 0.049722, 0.059696, 0.064279,
      0.068538, 0.074722, 0.074953, 0.082595, 0.093316, 0.109029, 0.117057,
      0.12394, 0.136335, 0.14363, 0.148682, 0.158261, 0.167062, 0.170759,
      0.172899, 0.17337, 0.184984, 0.186739, 0.191436, 0.193994, 0.200401,
      0.203234, 0.205413, 0.207174, 0.21361, 0.214473, 0.222061, 0.224053,
      0.225584, 0.227634, 0.242325, 0.246772, 0.248071, 0.252303, 0.259854,
      0.277816, 0.28289, 0.284086, 0.285169, 0.28545, 0.299928, 0.312056,
      0.312433, 0.315399, 0.333718, 0.341729, 0.361751, 0.375817, 0.375904,
      0.379007, 0.382933, 0.385336, 0.387208, 0.394622, 0.39497, 0.39898,
      0.403013, 0.404664, 0.417497, 0.421226, 0.425036, 0.427037, 0.446502,
      0.462698, 0.480159, 0.497789, 0.499416, 0.503414, 0.53846, 0.540815,
      0.541868, 0.562419, 0.60113, 0.605694, 0.617196, 0.652565, 0.685535,
      0.690022, 0.740267, 0.754035, 0.773977, 0.783629, 0.895807, 0.906143,
      1.006823, 1.01945, 1.065114, 1.070569, 1.220535,
    ],
  },
  {
    ruleset: Ruleset.Osu,
    teamSize: 3,
    logRatios: [
      0.000827, 0.00755, 0.008634, 0.011, 0.026704, 0.029078, 0.042987,
      0.044649, 0.046807, 0.060792, 0.092295, 0.095756, 0.131585, 0.133859,
      0.13927, 0.151297, 0.165153, 0.165534, 0.168356, 0.169835, 0.170295,
      0.172853, 0.174426, 0.181603, 0.182008, 0.184199, 0.187578, 0.191971,
      0.204518, 0.21094, 0.219733, 0.231082, 0.237521, 0.238281, 0.26558,
      0.266935, 0.282064, 0.294514, 0.296593, 0.302675, 0.303602, 0.328318,
      0.34569, 0.353088, 0.354828, 0.36202, 0.364276, 0.377933, 0.387786,
      0.434191, 0.443656, 0.446129, 0.459042, 0.468353, 0.512299, 0.534562,
      0.538987, 0.601816, 0.658799, 0.689562, 0.885091,
    ],
  },
  {
    ruleset: Ruleset.Osu,
    teamSize: 4,
    logRatios: [
      0.034527, 0.086144, 0.121325, 0.154881, 0.162581, 0.216573, 0.229283,
      0.338748, 0.58364,
    ],
  },
  {
    ruleset: Ruleset.Osu,
    teamSize: 5,
    logRatios: [
      0.004327, 0.025776, 0.0585, 0.085006, 0.089169, 0.100402, 0.124613,
      0.130498, 0.164082, 0.195235, 0.202474, 0.250244,
    ],
  },
];
