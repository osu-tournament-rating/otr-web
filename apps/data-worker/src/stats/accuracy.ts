import { Ruleset } from '@otr/core/osu';

interface AccuracyInputs {
  ruleset: Ruleset;
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  countKatu: number;
  countGeki: number;
}

export const calculateAccuracy = ({
  ruleset,
  count300,
  count100,
  count50,
  countMiss,
  countKatu,
  countGeki,
}: AccuracyInputs) => {
  switch (ruleset) {
    case Ruleset.Osu: {
      const divisor = 300 * (count300 + count100 + count50 + countMiss);
      if (divisor === 0) {
        return 0;
      }
      const numerator = 300 * count300 + 100 * count100 + 50 * count50;
      return (100 * numerator) / divisor;
    }
    case Ruleset.Taiko: {
      const divisor = count300 + count100 + countMiss;
      if (divisor === 0) {
        return 0;
      }
      const numerator = count300 + 0.5 * count100;
      return (100 * numerator) / divisor;
    }
    case Ruleset.Catch: {
      const divisor = count300 + count100 + count50 + countMiss + countKatu;
      if (divisor === 0) {
        return 0;
      }
      const numerator = count300 + count100 + count50;
      return (100 * numerator) / divisor;
    }
    default: {
      const divisor =
        305 *
        (countGeki + count300 + countKatu + count100 + count50 + countMiss);
      if (divisor === 0) {
        return 0;
      }
      const numerator =
        305 * countGeki +
        300 * count300 +
        200 * countKatu +
        100 * count100 +
        50 * count50;
      return (100 * numerator) / divisor;
    }
  }
};
