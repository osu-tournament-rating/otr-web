// noinspection SpellCheckingInspection

import {
  HttpValidationProblemDetails,
  MatchRejectionReason, MatchWarningFlags,
  ProblemDetails,
  Roles,
  Ruleset
} from '@osu-tournament-rating/otr-api-client';
import StandardSVG from '@/public/icons/Ruleset Standard.svg';
import StandardSVGurl from '@/public/icons/Ruleset Standard.svg';
import TaikoSVG from '@/public/icons/Ruleset Taiko.svg';
import TaikoSVGurl from '@/public/icons/Ruleset Taiko.svg';
import CtbSVG from '@/public/icons/Ruleset Catch.svg';
import CtbSVGurl from '@/public/icons/Ruleset Catch.svg';
import ManiaSVG from '@/public/icons/Ruleset Mania.svg';
import ManiaSVGurl from '@/public/icons/Ruleset Mania.svg';
import { RulesetIconContent } from '@/lib/types';

/** Type guard for determining if an object is {@link ProblemDetails} */
export function isProblemDetails(obj: any): obj is ProblemDetails {
  return (
    obj !== null
    && obj !== undefined
    && typeof obj === 'object'
    && 'title' in obj
    && 'status' in obj
  );
}

/** Type guard for determining if an object is {@link HttpValidationProblemDetails} */
export function isHttpValidationProblemDetails(obj: any): obj is HttpValidationProblemDetails {
  return (
    isProblemDetails(obj) 
    && 'errors' in obj
    && typeof obj.errors === 'object'
    && Object.values(obj.errors).every(
      (value) => Array.isArray(value) && value.every((v) => typeof v === "string")
    )
  );
}

/** Denotes if a list of scopes contains the admin scope */
export function isAdmin(scopes: string[]) {
  return scopes.includes(Roles.Admin);
}

// ===========
// == Enums ==
// ===========

/** Mapping of {@link RulesetIconContent} indexed by {@link Ruleset} */
export const rulesetIcons: { [key in Ruleset]: RulesetIconContent } = {
  [Ruleset.Osu]: {
    image: StandardSVG,
    imageUrl: StandardSVGurl,
    alt: 'osu!',
    shortAlt: 'Standard'
  },
  [Ruleset.Taiko]: {
    image: TaikoSVG,
    imageUrl: TaikoSVGurl,
    alt: 'osu!Taiko',
    shortAlt: 'Taiko'
  },
  [Ruleset.Catch]: {
    image: CtbSVG,
    imageUrl: CtbSVGurl,
    alt: 'osu!Catch',
    shortAlt: 'Catch'
  },
  [Ruleset.ManiaOther]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania',
    shortAlt: 'Mania (Other)'
  },
  [Ruleset.Mania4k]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania 4K',
    shortAlt: 'Mania 4K'
  },
  [Ruleset.Mania7k]: {
    image: ManiaSVG,
    imageUrl: ManiaSVGurl,
    alt: 'osu!Mania 7K',
    shortAlt: 'Mania 7K'
  }
};

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