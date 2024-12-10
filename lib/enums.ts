import {
  MatchRejectionReason,
  MatchWarningFlags,
  Ruleset,
  VerificationStatus
} from '@osu-tournament-rating/otr-api-client';
import StandardSVG from '@/public/icons/Ruleset Standard.svg';
import StandardSVGurl from '@/public/icons/Ruleset Standard.svg?url';
import TaikoSVG from '@/public/icons/Ruleset Taiko.svg';
import TaikoSVGurl from '@/public/icons/Ruleset Taiko.svg?url';
import CtbSVG from '@/public/icons/Ruleset Catch.svg';
import CtbSVGurl from '@/public/icons/Ruleset Catch.svg?url';
import ManiaSVG from '@/public/icons/Ruleset Mania.svg';
import ManiaSVGurl from '@/public/icons/Ruleset Mania.svg?url';
import { FC, SVGProps } from 'react';

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

/** Stylistic metadata for each {@link VerificationStatus} */
export const VerificationStatusMetadata: {
  [key in VerificationStatus]: {
    /** CSS class name */
    className: string;

    /** Display text */
    text: string;

    /** Whether to display this status in a selectable dropdown */
    displayInDropdown?: boolean;
  }
} = {
  [VerificationStatus.None]: {
    className: 'pending',
    text: 'Pending'
  },
  [VerificationStatus.PreRejected]: {
    className: 'rejected',
    text: 'Pre-rejected',
    displayInDropdown: true
  },
  [VerificationStatus.PreVerified]: {
    className: 'verified',
    text: 'Pre-verified',
    displayInDropdown: true
  },
  [VerificationStatus.Rejected]: {
    className: 'rejected',
    text: 'Rejected',
    displayInDropdown: true
  },
  [VerificationStatus.Verified]: {
    className: 'verified',
    text: 'Verified',
    displayInDropdown: true
  }
}

/** Stylistic metadata for each {@link Ruleset} */
export const RulesetMetadata: {
  [key in Ruleset]: {
    /**
     * Icon image as a React element
     * @example
     * const taikoIcon = rulesetIcons[Ruleset.Taiko].image;
     * return (<taikoIcon />);
     */
    image: FC<SVGProps<SVGElement>>;

    /**
     * Icon image as a relative URL
     * @example
     * const taikoIconUrl = rulesetIcons[Ruleset.Taiko].imageUrl;
     * return (<img href={taikoIconUrl} />);
     */
    imageUrl: any;

    /**
     * Alt text
     *
     * Example:
     * For {@link Ruleset.Taiko} - 'osu!Taiko'
     */
    alt: string;

    /**
     * Shortened alt text
     *
     * Example:
     * For {@link Ruleset.Taiko} - 'Taiko'
     */
    shortAlt: string;
  }
} = {
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