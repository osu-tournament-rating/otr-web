import { beforeEach, describe, expect, it } from 'bun:test';
import { Mods, Ruleset, ScoreRejectionReason } from '@otr/core/osu';

import { ScoreAutomationChecks } from '../score-automation-checks';
import { createScore, resetIds } from '../test-utils';

describe('ScoreAutomationChecks', () => {
  const checker = new ScoreAutomationChecks();

  beforeEach(() => {
    resetIds();
  });

  it('flags scores below minimum threshold', () => {
    const score = createScore({ score: 500 });

    const result = checker.process(score, Ruleset.Osu);

    expect(result & ScoreRejectionReason.ScoreBelowMinimum).not.toBe(0);
  });

  it('accepts scores meeting minimum threshold', () => {
    const score = createScore({ score: 1001 });

    const result = checker.process(score, Ruleset.Osu);

    expect(result).toBe(ScoreRejectionReason.None);
  });

  it('flags invalid mods', () => {
    const score = createScore({ mods: Mods.SuddenDeath });

    const result = checker.process(score, Ruleset.Osu);

    expect(result & ScoreRejectionReason.InvalidMods).not.toBe(0);
  });

  it('flags ruleset mismatches', () => {
    const score = createScore({ ruleset: Ruleset.Taiko });

    const result = checker.process(score, Ruleset.Osu);

    expect(result & ScoreRejectionReason.RulesetMismatch).not.toBe(0);
  });
});
