import {
  AdminNoteRouteTarget,
  Mods,
  ReportEntityType,
  ScoreGrade,
} from '@otr/core/osu';

export type EnumMetadata = {
  text: string;
  description: string;
};

type EnumMetadataCollection<
  T extends number | string,
  M extends EnumMetadata,
> = {
  [key in T]: M;
};

interface IEnumHelperBase<T extends number | string, M extends EnumMetadata> {
  readonly metadata: EnumMetadataCollection<T, M>;
}

export interface IEnumHelper<
  T extends number | string,
  M extends EnumMetadata = EnumMetadata,
> extends IEnumHelperBase<T, M> {
  getMetadata: (value: T) => M;
}

/** Base {@link IEnumHelper}; callers always override `metadata`. */
const defaultEnumHelper = <
  T extends number | string,
  M extends EnumMetadata = EnumMetadata,
>(): IEnumHelper<T, M> => ({
  metadata: {} as EnumMetadataCollection<T, M>,

  getMetadata(value) {
    return this.metadata[value];
  },
});

export interface IBitwiseEnumHelper<
  T extends number,
  M extends EnumMetadata = EnumMetadata,
> extends IEnumHelperBase<T, M> {
  getMetadata: (value: T) => M[];

  getFlags: (value: T) => T[];
}

/** The individual flags set in a bitwise enum value. */
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

/** Base {@link IBitwiseEnumHelper}; callers always override `metadata`. */
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
