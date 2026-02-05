import {
  AdminNoteRouteTarget,
  AuditActionType,
  AuditEntityType,
  FilteringFailReason,
  GameRejectionReason,
  GameWarningFlags,
  MatchRejectionReason,
  MatchWarningFlags,
  Mods,
  RatingAdjustmentType,
  ReportEntityType,
  ReportStatus,
  Ruleset,
  ScoreGrade,
  ScoreRejectionReason,
  ScoringType,
  Team,
  TeamType,
  TournamentQuerySortType,
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

/** Basic enum metadata */
export type EnumMetadata = {
  text: string;
  description: string;
};

/**
 * A collection of metadata describing each entry in an enumeration
 * @template T Enumeration type
 * @template M Metadata type
 */
type EnumMetadataCollection<
  T extends number | string,
  M extends EnumMetadata,
> = {
  [key in T]: M;
};

/**
 * Interfaces an object that stores enum metadata
 * @template T Enumeration type
 * @template M Metadata type
 */
interface IEnumHelperBase<T extends number | string, M extends EnumMetadata> {
  /** Collection of metadata */
  readonly metadata: EnumMetadataCollection<T, M>;
}

/**
 * Interfaces an object that helps with parsing enums
 * @template T Enumeration type
 * @template M Metadata type
 */
export interface IEnumHelper<
  T extends number | string,
  M extends EnumMetadata = EnumMetadata,
> extends IEnumHelperBase<T, M> {
  /**
   * Gets the metadata describing a given enum value
   * @param value Enum value
   * @returns Metadata describing the given enum value
   */
  getMetadata: (value: T) => M;
}

/**
 * Creates a default implementation of an {@link IEnumHelper}
 *
 * {@link IEnumHelper.metadata} should always be overwritten
 * @template T Enumeration type
 * @template M Metadata type
 */
const defaultEnumHelper = <
  T extends number | string,
  M extends EnumMetadata = EnumMetadata,
>(): IEnumHelper<T, M> => ({
  metadata: {} as EnumMetadataCollection<T, M>,

  getMetadata(value) {
    return this.metadata[value];
  },
});

/**
 * Interfaces an object that helps with parsing bitwise enums
 * @template T Bitwise enumeration type
 * @template M Metadata type
 */
export interface IBitwiseEnumHelper<
  T extends number,
  M extends EnumMetadata = EnumMetadata,
> extends IEnumHelperBase<T, M> {
  /**
   * Gets a list of metadata describing each flag in a given bitwise enum value
   * @param value Bitwise enum value
   * @returns Metadata describing each flag in the given bitwise enum value
   */
  getMetadata: (value: T) => M[];

  /**
   * Gets a list of individual flags in a given bitwise enum value
   * @param value Bitwise enum value
   * @returns A list of individual flags in the given bitwise enum value
   */
  getFlags: (value: T) => T[];
}

/** Produces an array of individual flags from a bitwise enumeration */
export function getEnumFlags<T extends object>(
  value: number | undefined,
  enumType: T
) {
  const flags: T[keyof T][] = [];

  if (!value) {
    return flags;
  }

  for (const [enumKey, enumValue] of Object.entries(enumType)) {
    if (
      typeof enumValue === 'number' &&
      enumValue !== 0 &&
      (value & enumValue) === enumValue
    ) {
      flags.push(enumType[enumKey as keyof T]);
    }
  }

  return flags;
}

/**
 * Creates a default implementation of an {@link IBitwiseEnumHelper}
 *
 * {@link IBitwiseEnumHelper.metadata} should always be overwritten
 * @template T Enumeration type
 * @template M Metadata type
 */
const defaultBitwiseEnumHelper = <
  T extends number,
  M extends EnumMetadata = EnumMetadata,
>(
  enumObject: object
): IBitwiseEnumHelper<T, M> => ({
  metadata: {} as EnumMetadataCollection<T, M>,

  getFlags(value) {
    return getEnumFlags(value, enumObject);
  },

  getMetadata(value) {
    return this.getFlags(value).map((flag) => this.metadata[flag]);
  },
});

const noneEnumMetadata: EnumMetadata = {
  text: 'None',
  description: 'No description',
};

export const VerificationStatusEnumHelper: IEnumHelper<VerificationStatus> = {
  ...defaultEnumHelper(),

  metadata: {
    [VerificationStatus.None]: {
      text: 'Pending',
      description: 'The submitted item is pending approval by the o!TR Team',
    },
    [VerificationStatus.PreRejected]: {
      text: 'Pre-rejected',
      description: 'The system has found issues which warrant pre-rejection',
    },
    [VerificationStatus.PreVerified]: {
      text: 'Pre-verified',
      description:
        'The system sees no major issues and marked the item as pre-verified',
    },
    [VerificationStatus.Rejected]: {
      text: 'Rejected',
      description: 'The item is not suitable for use in ratings',
    },
    [VerificationStatus.Verified]: {
      text: 'Verified',
      description:
        'The item is suitable for ratings and has been manually verified by a member of the o!TR team',
    },
  },
};

export const TournamentQuerySortTypeEnumHelper: IEnumHelper<TournamentQuerySortType> =
  {
    ...defaultEnumHelper(),

    metadata: {
      [TournamentQuerySortType.Id]: {
        text: 'ID',
        description: 'Sort by primary key (legacy submission order)',
      },
      [TournamentQuerySortType.StartTime]: {
        text: 'Start Date',
        description: 'Sort by the tournament start date',
      },
      [TournamentQuerySortType.EndTime]: {
        text: 'End Date',
        description: 'Sort by the tournament end date',
      },
      [TournamentQuerySortType.SearchQueryRelevance]: {
        text: 'Search Relevance',
        description: 'Sort by how closely tournaments match the search term',
      },
      [TournamentQuerySortType.SubmissionDate]: {
        text: 'Submission Date',
        description: 'Sort by when tournaments were submitted to o!TR',
      },
      [TournamentQuerySortType.LobbySize]: {
        text: 'Lobby Size',
        description: 'Sort by configured lobby size',
      },
    },
  };

export const AdminNoteRouteTargetEnumHelper: IEnumHelper<AdminNoteRouteTarget> =
  {
    ...defaultEnumHelper(),

    metadata: {
      [AdminNoteRouteTarget.Game]: {
        text: 'Game',
        description: '',
      },
      [AdminNoteRouteTarget.GameScore]: {
        text: 'Score',
        description: '',
      },
      [AdminNoteRouteTarget.Match]: {
        text: 'Match',
        description: '',
      },
      [AdminNoteRouteTarget.OAuthClient]: {
        text: 'OAuth Client',
        description: '',
      },
      [AdminNoteRouteTarget.Player]: {
        text: 'Player',
        description: '',
      },
      [AdminNoteRouteTarget.Tournament]: {
        text: 'Tournament',
        description: '',
      },
    },
  };

export const RulesetEnumHelper: IEnumHelper<Ruleset> = {
  ...defaultEnumHelper(),

  metadata: {
    [Ruleset.Osu]: {
      text: 'osu!',
      description: '',
    },
    [Ruleset.Taiko]: {
      text: 'osu!taiko',
      description: '',
    },
    [Ruleset.Catch]: {
      text: 'osu!catch',
      description: '',
    },
    [Ruleset.ManiaOther]: {
      text: 'osu!mania (other)',
      description: '',
    },
    [Ruleset.Mania4k]: {
      text: 'osu!mania 4K',
      description: '',
    },
    [Ruleset.Mania7k]: {
      text: 'osu!mania 7K',
      description: '',
    },
  },
};

export const LobbySizeEnumHelper = {
  toString: (lobbySize: number): string => {
    if (lobbySize < 1) {
      return 'Unknown';
    }
    if (lobbySize === 1) {
      return '1v1';
    }
    return `${lobbySize}v${lobbySize}`;
  },
};

export const RatingAdjustmentTypeEnumhelper: IEnumHelper<RatingAdjustmentType> =
  {
    ...defaultEnumHelper(),

    metadata: {
      [RatingAdjustmentType.Initial]: {
        text: 'Initial',
        description: 'The initial rating assigned by the processor',
      },
      [RatingAdjustmentType.Decay]: {
        text: 'Decay',
        description: 'Rating adjustment created as a result of decay',
      },
      [RatingAdjustmentType.Match]: {
        text: 'Match',
        description:
          'Adjustment in rating based on performance in a tournament match',
      },
      [RatingAdjustmentType.VolatilityDecay]: {
        text: 'Volatility Decay',
        description:
          'Rating adjustment created as a result of volatility decay',
      },
    },
  };

export const TournamentRejectionReasonEnumHelper: IBitwiseEnumHelper<TournamentRejectionReason> =
  {
    ...defaultBitwiseEnumHelper(TournamentRejectionReason),

    metadata: {
      [TournamentRejectionReason.None]: {
        text: 'No Rejection Reason',
        description: 'placeholder',
      },
      [TournamentRejectionReason.NoVerifiedMatches]: {
        text: 'No Verified Matches',
        description: 'placeholder',
      },
      [TournamentRejectionReason.NotEnoughVerifiedMatches]: {
        text: 'Not Enough Verified Matches',
        description: 'placeholder',
      },
      [TournamentRejectionReason.AbnormalWinCondition]: {
        text: 'Abnormal Win Condition',
        description: 'placeholder',
      },
      [TournamentRejectionReason.AbnormalFormat]: {
        text: 'Abnormal Format',
        description: 'placeholder',
      },
      [TournamentRejectionReason.VaryingLobbySize]: {
        text: 'Varying Lobby Size',
        description: 'placeholder',
      },
      [TournamentRejectionReason.IncompleteData]: {
        text: 'Incomplete Data',
        description: 'placeholder',
      },
    },
  };

export const MatchRejectionReasonEnumHelper: IBitwiseEnumHelper<MatchRejectionReason> =
  {
    ...defaultBitwiseEnumHelper(MatchRejectionReason),

    metadata: {
      [MatchRejectionReason.None]: noneEnumMetadata,
      [MatchRejectionReason.NoData]: {
        text: 'No data',
        description: 'The osu! API returned invalid or no data for the match',
      },
      [MatchRejectionReason.NoGames]: {
        text: 'No games',
        description: 'The osu! API returned no games for the match',
      },
      [MatchRejectionReason.NamePrefixMismatch]: {
        text: 'Prefix mismatch',
        description:
          "The match's name does not start with the tournament's abbreviation",
      },
      [MatchRejectionReason.FailedTeamVsConversion]: {
        text: 'Failed TeamVs Conversion',
        description:
          'The match was eligible for TeamVs Conversion, but the attempted conversion was not successful',
      },
      [MatchRejectionReason.NoValidGames]: {
        text: 'No valid games',
        description:
          "None of the match's games passed automation checks with a status of Pre-Verified",
      },
      [MatchRejectionReason.UnexpectedGameCount]: {
        text: 'Unexpected game count',
        description: 'The match has less than 3 Pre-Verified or Verified games',
      },
      [MatchRejectionReason.NoEndTime]: {
        text: 'No end time',
        description: "The match's end time could not be determined",
      },
      [MatchRejectionReason.RejectedTournament]: {
        text: 'Rejected tournament',
        description: "The match's tournament was rejected",
      },
    },
  };

export const MatchWarningFlagsEnumHelper: IBitwiseEnumHelper<MatchWarningFlags> =
  {
    ...defaultBitwiseEnumHelper(MatchWarningFlags),

    metadata: {
      [MatchWarningFlags.None]: noneEnumMetadata,
      [MatchWarningFlags.UnexpectedNameFormat]: {
        text: 'Unexpected name format',
        description:
          "The match's name does not follow expected title formatting",
      },
      [MatchWarningFlags.LowGameCount]: {
        text: 'Low game count',
        description:
          'The match has exactly 4 or 5 Pre-Verified or Verified games',
      },
      [MatchWarningFlags.UnexpectedBeatmapsFound]: {
        text: 'Unpooled beatmap found beyond first two games',
        description:
          'The match has one or more games where a beatmap that was not pooled was played outside of the first two games',
      },
      [MatchWarningFlags.OverlappingRosters]: {
        text: 'Overlapping rosters found',
        description:
          "The match's roster features one or more players on more than one roster. Only one player per roster is allowed.",
      },
    },
  };

export const GameRejectionReasonEnumHelper: IBitwiseEnumHelper<GameRejectionReason> =
  {
    ...defaultBitwiseEnumHelper(GameRejectionReason),

    metadata: {
      [GameRejectionReason.None]: noneEnumMetadata,
      [GameRejectionReason.NoScores]: {
        text: 'No Scores',
        description: 'The osu! API returned no scores for the game',
      },
      [GameRejectionReason.InvalidMods]: {
        text: 'Invalid Mods',
        description: 'The game was played with invalid mods applied',
      },
      [GameRejectionReason.RulesetMismatch]: {
        text: 'Ruleset Mismatch',
        description:
          "The game was played in a ruleset differing from it's tournament",
      },
      [GameRejectionReason.InvalidScoringType]: {
        text: 'Invalid Scoring Type',
        description:
          'The game was played with a scoring type that is not ScoreV2 or Lazer',
      },
      [GameRejectionReason.InvalidTeamType]: {
        text: 'Invalid Team Type',
        description:
          "The game was played with a team type that is not 'TeamVs'",
      },
      [GameRejectionReason.FailedTeamVsConversion]: {
        text: 'Failed TeamVs Conversion',
        description:
          'The game was eligible for TeamVs Conversion, but the attempted conversion was not successful',
      },
      [GameRejectionReason.NoValidScores]: {
        text: 'No Valid Scores',
        description:
          'The game has less than two scores that are Verified or PreVerified',
      },
      [GameRejectionReason.LobbySizeMismatch]: {
        text: 'Lobby Size Mismatch',
        description:
          "The number of scores submitted in the game differs from the lobby size of it's tournament",
      },
      [GameRejectionReason.NoEndTime]: {
        text: 'No End Time',
        description: 'The end time of the game could not be determined',
      },
      [GameRejectionReason.RejectedMatch]: {
        text: 'Rejected Match',
        description: "The game's match was rejected",
      },
      [GameRejectionReason.BeatmapNotPooled]: {
        text: 'Beatmap Not Pooled',
        description:
          'The tournament has a submitted mappool, but the game was played on a map outside of the pool',
      },
    },
  };

export const GameWarningFlagsEnumHelper: IBitwiseEnumHelper<GameWarningFlags> =
  {
    ...defaultBitwiseEnumHelper(GameWarningFlags),

    metadata: {
      [GameWarningFlags.None]: noneEnumMetadata,
      [GameWarningFlags.BeatmapUsedOnce]: {
        text: 'Beatmap Only Used Once',
        description:
          'The tournament does not have a submitted mappool and the map was only played once throughout',
      },
    },
  };

export const ScoreRejectionReasonEnumHelper: IBitwiseEnumHelper<ScoreRejectionReason> =
  {
    ...defaultBitwiseEnumHelper(ScoreRejectionReason),

    metadata: {
      [ScoreRejectionReason.None]: noneEnumMetadata,
      [ScoreRejectionReason.ScoreBelowMinimum]: {
        text: 'Below Minimum Score',
        description: 'placeholder',
      },
      [ScoreRejectionReason.InvalidMods]: {
        text: 'Invalid Mods',
        description: 'placeholder',
      },
      [ScoreRejectionReason.RulesetMismatch]: {
        text: 'Ruleset Mismatch',
        description: 'placeholder',
      },
      [ScoreRejectionReason.RejectedGame]: {
        text: 'Rejected Game',
        description: 'placeholder',
      },
    },
  };

export const ScoringTypeEnumHelper: IEnumHelper<ScoringType> = {
  ...defaultEnumHelper(),

  metadata: {
    [ScoringType.Score]: {
      text: 'ScoreV1',
      description: 'placeholder',
    },
    [ScoringType.Accuracy]: {
      text: 'Accuracy',
      description: 'placeholder',
    },
    [ScoringType.Combo]: {
      text: 'Combo',
      description: 'placeholder',
    },
    [ScoringType.ScoreV2]: {
      text: 'ScoreV2',
      description: 'placeholder',
    },
    [ScoringType.Lazer]: {
      text: 'Lazer',
      description: 'Lazer scoring type',
    },
  },
};

export const TeamTypeEnumHelper: IEnumHelper<TeamType> = {
  ...defaultEnumHelper(),

  metadata: {
    [TeamType.HeadToHead]: {
      text: 'Head to Head',
      description: 'Free for all',
    },
    [TeamType.TagCoop]: {
      text: 'Tag Co-op',
      description: 'Free for all in tag format',
    },
    [TeamType.TeamVs]: {
      text: 'Team Vs',
      description: 'Team red vs team blue',
    },
    [TeamType.TagTeamVs]: {
      text: 'Tag Team Vs',
      description: 'Team red vs team blue in tag format',
    },
  },
};

export const ModsEnumHelper: IBitwiseEnumHelper<Mods> = {
  ...defaultBitwiseEnumHelper(Mods),

  metadata: {
    [Mods.None]: {
      text: 'NM',
      description: 'No mod',
    },
    [Mods.NoFail]: {
      text: 'NF',
      description: 'No fail',
    },
    [Mods.Easy]: {
      text: 'EZ',
      description: 'Easy',
    },
    [Mods.TouchDevice]: {
      text: 'TD',
      description: 'Touch device',
    },
    [Mods.Hidden]: {
      text: 'HD',
      description: 'Hidden',
    },
    [Mods.HardRock]: {
      text: 'HR',
      description: 'Hard rock',
    },
    [Mods.SuddenDeath]: {
      text: 'SD',
      description: 'Sudden death',
    },
    [Mods.DoubleTime]: {
      text: 'DT',
      description: 'Double time',
    },
    [Mods.Relax]: {
      text: 'RX',
      description: 'Relax',
    },
    [Mods.HalfTime]: {
      text: 'HT',
      description: 'Half time',
    },
    [Mods.Nightcore]: {
      text: 'NC',
      description: 'Nightcore',
    },
    [Mods.Flashlight]: {
      text: 'FL',
      description: 'Flashlight',
    },
    [Mods.Autoplay]: {
      text: 'AT',
      description: 'Auto',
    },
    [Mods.SpunOut]: {
      text: 'SO',
      description: 'Spun out',
    },
    [Mods.Relax2]: {
      text: 'AP',
      description: 'Autopilot',
    },
    [Mods.Perfect]: {
      text: 'PF',
      description: 'Perfect',
    },
    [Mods.InvalidMods]: {
      text: 'Invalid Mods',
      description: '',
    },
    [Mods.Key4]: {
      text: '4K',
      description: 'Mania 4 key',
    },
    [Mods.Key5]: {
      text: '5K',
      description: 'Mania 5 key',
    },
    [Mods.Key6]: {
      text: '6K',
      description: 'Mania 6 key',
    },
    [Mods.Key7]: {
      text: '',
      description: '',
    },
    [Mods.Key8]: {
      text: '',
      description: '',
    },
    [Mods.FadeIn]: {
      text: 'FI',
      description: 'Fade in',
    },
    [Mods.ScoreIncreaseMods]: {
      text: '',
      description: '',
    },
    [Mods.Random]: {
      text: 'RD',
      description: 'Random',
    },
    [Mods.Cinema]: {
      text: 'CM',
      description: 'Cinema',
    },
    [Mods.Target]: {
      text: '',
      description: '',
    },
    [Mods.Key9]: {
      text: '',
      description: '',
    },
    [Mods.KeyCoop]: {
      text: '',
      description: '',
    },
    [Mods.Key1]: {
      text: '',
      description: '',
    },
    [Mods.Key3]: {
      text: '',
      description: '',
    },
    [Mods.Key2]: {
      text: '',
      description: '',
    },
    [Mods.KeyMod]: {
      text: '',
      description: '',
    },
    [Mods.FreeModAllowed]: {
      text: '',
      description: '',
    },
    [Mods.ScoreV2]: {
      text: 'V2',
      description: '',
    },
    [Mods.Mirror]: {
      text: 'MR',
      description: '',
    },
  },
};

export const TeamEnumHelper: IEnumHelper<Team> = {
  ...defaultEnumHelper(),

  metadata: {
    [Team.NoTeam]: {
      text: 'No Team',
      description: '',
    },
    [Team.Blue]: {
      text: 'Blue',
      description: '',
    },
    [Team.Red]: {
      text: 'Red',
      description: '',
    },
  },
};

export const ScoreGradeEnumHelper: IEnumHelper<ScoreGrade> = {
  ...defaultEnumHelper(),

  metadata: {
    [ScoreGrade.SSH]: {
      text: 'SSH',
      description: '',
    },
    [ScoreGrade.SH]: {
      text: 'SH',
      description: '',
    },
    [ScoreGrade.SS]: {
      text: 'SS',
      description: '',
    },
    [ScoreGrade.S]: {
      text: 'S',
      description: '',
    },
    [ScoreGrade.A]: {
      text: 'A',
      description: '',
    },
    [ScoreGrade.B]: {
      text: 'B',
      description: '',
    },
    [ScoreGrade.C]: {
      text: 'C',
      description: '',
    },
    [ScoreGrade.D]: {
      text: 'D',
      description: '',
    },
  },
};

export const FilteringFailReasonEnumHelper: IBitwiseEnumHelper<FilteringFailReason> =
  {
    ...defaultBitwiseEnumHelper(FilteringFailReason),

    metadata: {
      [FilteringFailReason.None]: {
        text: 'None',
        description: 'No failure reason',
      },
      [FilteringFailReason.MinRating]: {
        text: 'Low Rating',
        description: "The player's rating is below the minimum threshold",
      },
      [FilteringFailReason.MaxRating]: {
        text: 'High Rating',
        description: "The player's rating is above the maximum threshold",
      },
      [FilteringFailReason.NotEnoughTournaments]: {
        text: 'Low Tournaments',
        description:
          'The player has not played in the minimum specified number of tournaments',
      },
      [FilteringFailReason.PeakRatingTooHigh]: {
        text: 'High Peak',
        description:
          "The player's all-time peak rating exceeds the maximum allowed",
      },
      [FilteringFailReason.NotEnoughMatches]: {
        text: 'Low Matches',
        description:
          'The player has not played in the minimum specified number of matches',
      },
      [FilteringFailReason.TooManyMatches]: {
        text: 'High Matches',
        description:
          'The player has played in more than the maximum specified number of matches',
      },
      [FilteringFailReason.TooManyTournaments]: {
        text: 'High Tournaments',
        description:
          'The player has participated in more than the maximum specified number of tournaments',
      },
    },
  };

export const ReportEntityTypeEnumHelper: IEnumHelper<ReportEntityType> = {
  ...defaultEnumHelper(),

  metadata: {
    [ReportEntityType.Tournament]: {
      text: 'Tournament',
      description: '',
    },
    [ReportEntityType.Match]: {
      text: 'Match',
      description: '',
    },
    [ReportEntityType.Game]: {
      text: 'Game',
      description: '',
    },
    [ReportEntityType.Score]: {
      text: 'Score',
      description: '',
    },
  },
};

export const ReportStatusEnumHelper: IEnumHelper<ReportStatus> = {
  ...defaultEnumHelper(),

  metadata: {
    [ReportStatus.Pending]: {
      text: 'Pending',
      description: 'Awaiting review',
    },
    [ReportStatus.Approved]: {
      text: 'Approved',
      description: 'Report was accepted',
    },
    [ReportStatus.Rejected]: {
      text: 'Rejected',
      description: 'Report was declined',
    },
  },
};

export const AuditActionTypeEnumHelper: IEnumHelper<AuditActionType> = {
  ...defaultEnumHelper(),

  metadata: {
    [AuditActionType.Created]: {
      text: 'Created',
      description: 'Entity was created',
    },
    [AuditActionType.Updated]: {
      text: 'Updated',
      description: 'Entity was updated',
    },
    [AuditActionType.Deleted]: {
      text: 'Deleted',
      description: 'Entity was deleted',
    },
  },
};

export const AuditEntityTypeEnumHelper: IEnumHelper<AuditEntityType> = {
  ...defaultEnumHelper(),

  metadata: {
    [AuditEntityType.Tournament]: {
      text: 'Tournament',
      description: '',
    },
    [AuditEntityType.Match]: {
      text: 'Match',
      description: '',
    },
    [AuditEntityType.Game]: {
      text: 'Game',
      description: '',
    },
    [AuditEntityType.Score]: {
      text: 'Score',
      description: '',
    },
  },
};

export const DataFetchStatusEnumHelper: IEnumHelper<number> = {
  ...defaultEnumHelper(),

  metadata: {
    [DataFetchStatus.NotFetched]: {
      text: 'Not Fetched',
      description: 'Data has not been fetched yet',
    },
    [DataFetchStatus.Fetching]: {
      text: 'Fetching',
      description: 'Data is currently being fetched',
    },
    [DataFetchStatus.Fetched]: {
      text: 'Fetched',
      description: 'Data has been successfully fetched',
    },
    [DataFetchStatus.NotFound]: {
      text: 'Not Found',
      description: 'Data was not found',
    },
    [DataFetchStatus.Error]: {
      text: 'Error',
      description: 'An error occurred while fetching data',
    },
  },
};
