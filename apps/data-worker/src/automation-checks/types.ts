import {
  GameRejectionReason,
  GameWarningFlags,
  MatchRejectionReason,
  MatchWarningFlags,
  Mods,
  Ruleset,
  ScoreRejectionReason,
  ScoringType,
  Team,
  TeamType,
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';

export interface AutomationTournament {
  id: number;
  abbreviation: string;
  ruleset: Ruleset;
  lobbySize: number;
  verificationStatus: VerificationStatus;
  rejectionReason: TournamentRejectionReason;
  matches: AutomationMatch[];
  pooledBeatmaps: AutomationBeatmap[];
}

export interface AutomationBeatmap {
  id: number;
  osuId: number;
}

export interface AutomationMatch {
  id: number;
  name: string;
  startTime: string | null;
  endTime: string | null;
  verificationStatus: VerificationStatus;
  rejectionReason: MatchRejectionReason;
  warningFlags: MatchWarningFlags;
  games: AutomationGame[];
  rosters: AutomationMatchRoster[];
}

export interface AutomationMatchRoster {
  id: number;
  matchId: number;
  team: Team;
  roster: number[];
  score: number;
}

export interface AutomationGame {
  id: number;
  osuId: number;
  matchId: number;
  ruleset: Ruleset;
  scoringType: ScoringType;
  teamType: TeamType;
  mods: Mods;
  startTime: string;
  endTime: string;
  playMode: Ruleset;
  verificationStatus: VerificationStatus;
  rejectionReason: GameRejectionReason;
  warningFlags: GameWarningFlags;
  beatmap: AutomationBeatmap | null;
  scores: AutomationScore[];
  rosters: AutomationGameRoster[];
}

export interface AutomationGameRoster {
  id: number;
  gameId: number;
  team: Team;
  roster: number[];
  score: number;
}

export interface AutomationScore {
  id: number;
  score: number;
  mods: Mods;
  team: Team;
  ruleset: Ruleset;
  verificationStatus: VerificationStatus;
  rejectionReason: ScoreRejectionReason;
  playerId: number;
  gameId?: number;
}

export const enum PlaceholderDate {
  /** ISO timestamp representing a placeholder date before Unix epoch */
  MinValue = '0001-01-01T00:00:00.000Z',
}
