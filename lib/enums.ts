import { MatchRejectionReason, MatchWarningFlags } from '@osu-tournament-rating/otr-api-client';

/** Gets an array of individual flags from a bitwise enumeration */
export function getFlags<T extends object>(value: number, enumType: T) {
  const flags= [];

  for (const [enumKey, enumValue] of Object.entries(enumType)) {
    if (typeof enumValue === 'number' && enumValue !== 0 && (value & enumValue) === enumValue) {
      flags.push(enumType[enumKey as keyof T]);
    }
  }

  return flags;
}

/** Text for displaying {@link MatchRejectionReason} */
export const matchRejectionReasonText: {
  [key in MatchRejectionReason]: {
    text: string;
    description: string;
  }
} = {
  [MatchRejectionReason.None]: {
    text: 'None',
    description: 'No description'
  },
  [MatchRejectionReason.NoData]: {
    text: 'No data',
    description: 'The osu! API returned invalid or no data for the match'
  },
  [MatchRejectionReason.NoGames]: {
    text: 'No games',
    description: 'The osu! API returned no games for the match'
  },
  [MatchRejectionReason.NamePrefixMismatch]: {
    text: 'Prefix mismatch',
    description: 'The match\'s name does not start with the tournament\'s abbreviation'
  },
  [MatchRejectionReason.FailedTeamVsConversion]: {
    text: 'Failed TeamVs Conversion',
    description: 'The match was eligible for TeamVs Conversion, but the conversion was not successful'
  },
  [MatchRejectionReason.NoValidGames]: {
    text: 'No valid games',
    description: 'None of the match\'s games passed automation checks with a status of Pre-Verified'
  },
  [MatchRejectionReason.UnexpectedGameCount]: {
    text: 'Unexpected game count',
    description: 'The match has less than 3 Pre-Verified or Verified games'
  },
  [MatchRejectionReason.NoEndTime]: {
    text: 'No end time',
    description: 'The match\'s end time could not be determined'
  },
  [MatchRejectionReason.RejectedTournament]: {
    text: 'Rejected tournament',
    description: 'The match\'s tournament was rejected'
  }
}

/** Formats a {@link MatchRejectionReason} into displayable text */
export function formatMatchRejectionReasons(value: MatchRejectionReason) {
  return getFlags(value, MatchRejectionReason).map(flag => matchRejectionReasonText[flag]);
}

/** Text for displaying {@link MatchWarningFlags} */
export const matchWarningFlagText: {
  [key in MatchWarningFlags]: {
    text: string;
    description: string;
  }
} = {
  [MatchWarningFlags.None]: {
    text: 'None',
    description: 'No description'
  },
  [MatchWarningFlags.UnexpectedNameFormat]: {
    text: 'Unexpected name format',
    description: 'The match\'s name does not follow expected title formatting'
  },
  [MatchWarningFlags.LowGameCount]: {
    text: 'Low game count',
    description: 'The match has exactly 4 or 5 Pre-Verified or Verified games'
  },
  [MatchWarningFlags.UnexpectedBeatmapsFound]: {
    text: 'Unexpected beatmaps found',
    description: 'The match has one or more games where a beatmap that was not pooled was played outside of the first two games'
  },
}

/** Formats a {@link MatchRejectionReason} into displayable text */
export function formatMatchWarningFlags(value: MatchWarningFlags) {
  return getFlags(value, MatchWarningFlags).map(flag => matchWarningFlagText[flag]);
}