import {
  GameRejectionReason,
  MatchWarningFlags,
  Mods,
  Team,
  VerificationStatus,
} from '@otr/core/osu';

import type { AutomationGame, AutomationScore } from './types';

const INVALID_MODS = new Set<Mods>([
  Mods.SuddenDeath,
  Mods.Perfect,
  Mods.Relax,
  Mods.Autoplay,
  Mods.Relax2,
]);

const PLACEHOLDER_THRESHOLD = new Date('1970-01-01T00:00:00.000Z').getTime();

export const isPlaceholderDate = (value: string | null | undefined) => {
  if (!value) {
    return true;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return true;
  }

  return parsed <= PLACEHOLDER_THRESHOLD;
};

export const isPreVerifiedOrVerified = (status: VerificationStatus) =>
  status === VerificationStatus.PreVerified ||
  status === VerificationStatus.Verified;

export const hasInvalidMods = (mods: Mods) =>
  Array.from(INVALID_MODS).some((flag) => (mods & flag) === flag);

export const combineRejection = <T extends number>(current: T, next: T): T =>
  (current | next) as T;

export const addWarningFlag = <T extends number>(current: T, flag: T): T =>
  (current | flag) as T;

export const clearWarningFlags = <T extends number>(): T => 0 as T;

export const hasWarningFlag = (flags: number, flag: number) =>
  (flags & flag) === flag;

export const aggregateScoreRoster = (scores: AutomationScore[]) => {
  const teams = new Map<Team, Set<number>>();

  for (const score of scores) {
    const set = teams.get(score.team) ?? new Set<number>();
    set.add(score.playerId);
    teams.set(score.team, set);
  }

  return teams;
};

export const countValidScores = (scores: AutomationScore[]) =>
  scores.filter((score) => isPreVerifiedOrVerified(score.verificationStatus));

export const gameHasValidScores = (game: AutomationGame) =>
  countValidScores(game.scores).length > 0;

export const ensureTeamAssignments = (
  scores: AutomationScore[],
  assignments: Map<number, Team>
) => {
  for (const score of scores) {
    const assigned = assignments.get(score.playerId);
    if (assigned !== undefined) {
      score.team = assigned;
    }
  }
};

export const assignMatchWarning = (
  flags: MatchWarningFlags,
  flag: MatchWarningFlags
) => addWarningFlag(flags, flag);

export const addGameRejection = (
  rejection: GameRejectionReason,
  reason: GameRejectionReason
) => combineRejection(rejection, reason);

export const WITHOUT_REJECTIONS = (value: number) => value === 0;
