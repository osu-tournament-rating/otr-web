import type { Ruleset } from '../osu/enums';

// These types describe retained database rows, not an active calculation API.
export type BeatmapStorageProvider = 'local' | 'gcp';
export type BeatmapAttributeJobStatus =
  'pending' | 'processing' | 'complete' | 'failed';

export interface CalculationSettings {
  ruleset: Ruleset;
  mods: number;
  mode: 0 | 1 | 2 | 3;
  clockRate: 1 | 1.5;
  lazer: false;
}

export interface BeatmapHitWindows {
  ar: number | null;
  odPerfect: number | null;
  odGreat: number | null;
  odGood: number | null;
  odOk: number | null;
  odMeh: number | null;
}

export type BeatmapDifficultyPayload = { version: 2 } & (
  | {
      mode: 0;
      aim: number;
      speed: number;
      flashlight: number;
      nCircles: number;
      nSliders: number;
      nSpinners: number;
    }
  | {
      mode: 1;
      stamina: number;
      rhythm: number;
      color: number;
      reading: number;
    }
  | {
      mode: 2;
      nFruits: number;
      nDroplets: number;
      nTinyDroplets: number;
    }
  | {
      mode: 3;
      keyCount: number;
      nObjects: number;
      nHoldNotes: number;
    }
);
