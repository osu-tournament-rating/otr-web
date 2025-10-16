import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import {
  experimental_ZodSmartCoercionPlugin as ZodSmartCoercionPlugin,
  ZodToJsonSchemaConverter,
} from '@orpc/zod/zod4';

import { router } from '@/app/server/oRPC/router';
import { LeaderboardEntrySchema } from '@/lib/orpc/schema/leaderboard';
import { MatchSchema } from '@/lib/orpc/schema/match';
import {
  PlayerBeatmapStatsSchema,
  PlayerBeatmapsResponseSchema,
} from '@/lib/orpc/schema/playerBeatmaps';
import { PlayerStatsSchema } from '@/lib/orpc/schema/playerStats';
import { PlayerSchema } from '@/lib/orpc/schema/player';
import {
  TournamentDetailSchema,
  TournamentListItemSchema,
} from '@/lib/orpc/schema/tournament';
import { UserSchema } from '@/lib/orpc/schema/user';
import { PlatformStatsSchema } from '@/lib/orpc/schema/stats';
import {
  RatingAdjustmentTypeSchema,
  RulesetSchema,
  ScoreGradeSchema,
  ScoringTypeSchema,
  TeamSchema,
  TeamTypeSchema,
  VerificationStatusSchema,
} from '@/lib/orpc/schema/constants';

const INTEGER_DEFAULT_MIN_VALUES = new Set([
  Number.MIN_SAFE_INTEGER,
  -2147483648,
]);
const INTEGER_DEFAULT_MAX_VALUES = new Set([
  Number.MAX_SAFE_INTEGER,
  2147483647,
]);

type MutableJSONSchema = Record<string, unknown> & {
  enum?: unknown;
  type?: unknown;
  minimum?: unknown;
  maximum?: unknown;
};

const asMutableSchema = (value: unknown): MutableJSONSchema | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as MutableJSONSchema)
    : null;

const sanitizeJsonSchema = (schema: unknown): void => {
  const root = asMutableSchema(schema);
  if (!root) {
    return;
  }

  const queue: MutableJSONSchema[] = [];
  const enqueue = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(enqueue);
    } else {
      const schemaCandidate = asMutableSchema(candidate);
      if (schemaCandidate) {
        queue.push(schemaCandidate);
      }
    }
  };

  enqueue(root);

  const childKeys = {
    direct: [
      'items',
      'additionalItems',
      'unevaluatedItems',
      'propertyNames',
      'additionalProperties',
      'unevaluatedProperties',
      'contains',
      'contentSchema',
      'if',
      'then',
      'else',
      'not',
    ],
    records: [
      'properties',
      'patternProperties',
      'definitions',
      '$defs',
      'dependentSchemas',
    ],
    arrays: ['allOf', 'anyOf', 'oneOf', 'prefixItems'],
  };

  while (queue.length > 0) {
    const node = queue.pop()!;

    const enumValues = Array.isArray(node.enum) ? node.enum : null;
    let prefersInteger = false;
    if (enumValues && enumValues.length > 0) {
      const numeric = enumValues.filter(
        (value: unknown): value is number => typeof value === 'number'
      );
      if (
        numeric.length > 0 &&
        numeric.length >= enumValues.length - numeric.length
      ) {
        node.enum = Array.from(new Set(numeric));
        prefersInteger = true;
      }
    }

    const rawType = node.type;
    const baseTypes = Array.isArray(rawType)
      ? rawType.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : typeof rawType === 'string'
        ? [rawType]
        : [];

    const hasIntegerType = prefersInteger || baseTypes.includes('integer');

    if (hasIntegerType) {
      const normalized = baseTypes.filter(
        (value) => value !== 'string' && value !== 'number'
      );
      if (!normalized.includes('integer')) {
        normalized.push('integer');
      }
      node.type =
        normalized.length === 0
          ? 'integer'
          : normalized.length === 1
            ? normalized[0]
            : normalized;

      if (
        typeof node.minimum === 'number' &&
        INTEGER_DEFAULT_MIN_VALUES.has(node.minimum)
      ) {
        delete node.minimum;
      }

      if (
        typeof node.maximum === 'number' &&
        INTEGER_DEFAULT_MAX_VALUES.has(node.maximum)
      ) {
        delete node.maximum;
      }
    }

    for (const key of childKeys.direct) {
      enqueue(node[key]);
    }

    for (const key of childKeys.records) {
      const entries = node[key];
      if (entries && typeof entries === 'object' && !Array.isArray(entries)) {
        Object.values(entries as Record<string, unknown>).forEach(enqueue);
      }
    }

    for (const key of childKeys.arrays) {
      enqueue(node[key]);
    }
  }
};

const schemaConverters = [
  new ZodToJsonSchemaConverter({
    interceptors: [
      ({ next }) => {
        const [required, jsonSchema] = next();
        sanitizeJsonSchema(jsonSchema);
        return [required, jsonSchema] as [typeof required, typeof jsonSchema];
      },
    ],
  }),
];

const isPublicProcedure = ({
  contract,
}: {
  contract: { ['~orpc']?: { route?: { tags?: readonly string[] } } };
}) =>
  Boolean(
    contract?.['~orpc']?.route?.tags?.some(
      (tag) => tag?.toLowerCase() === 'public'
    )
  );

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters,
});

export const openAPIHandler = new OpenAPIHandler(router, {
  plugins: [new ZodSmartCoercionPlugin()],
  filter: (args) => isPublicProcedure(args),
});

const API_SECURITY_SCHEME_NAME = 'ApiKeyAuth';
const securityRequirement = [{ [API_SECURITY_SCHEME_NAME]: [] as string[] }];
const tags = [
  {
    name: 'public',
    description:
      'Public endpoints that do not require authentication when used from the website, accessible via public API',
  },
  {
    name: 'authenticated',
    description: 'Endpoints that require a user to be signed in',
  },
  {
    name: 'admin',
    description: 'Admin-only endpoints',
  },
];

const buildServers = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;

  if (!baseUrl) {
    return [
      {
        url: '/api',
        description: 'API Server',
      },
    ];
  }

  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return [
    {
      url: `${normalized}/api`,
      description: 'o!TR API',
    },
  ];
};

export const generatePublicOpenAPISpec = async () => {
  return openAPIGenerator.generate(router, {
    info: {
      title: 'o!TR API',
      version: '1.0.0',
      description: 'osu! Tournament Rating API',
    },
    servers: buildServers(),
    tags,
    security: securityRequirement,
    components: {
      securitySchemes: {
        [API_SECURITY_SCHEME_NAME]: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description:
            'Send an o!TR API key using the Authorization: Bearer <key> header.',
        },
      },
    },
    commonSchemas: {
      Ruleset: { schema: RulesetSchema },
      ScoringType: { schema: ScoringTypeSchema },
      TeamType: { schema: TeamTypeSchema },
      Team: { schema: TeamSchema },
      ScoreGrade: { schema: ScoreGradeSchema },
      RatingAdjustmentType: { schema: RatingAdjustmentTypeSchema },
      VerificationStatus: { schema: VerificationStatusSchema },
      User: {
        schema: UserSchema,
      },
      Player: {
        schema: PlayerSchema,
      },
      Match: {
        schema: MatchSchema,
      },
      Tournament: {
        schema: TournamentDetailSchema,
      },
      TournamentListItem: {
        schema: TournamentListItemSchema,
      },
      LeaderboardEntry: {
        schema: LeaderboardEntrySchema,
      },
      PlayerBeatmap: {
        schema: PlayerBeatmapStatsSchema,
      },
      PlayerBeatmapResponse: {
        schema: PlayerBeatmapsResponseSchema,
      },
      PlayerStats: {
        schema: PlayerStatsSchema,
      },
      PlatformStats: {
        schema: PlatformStatsSchema,
      },
    },
    filter: (args) => isPublicProcedure(args),
  });
};
