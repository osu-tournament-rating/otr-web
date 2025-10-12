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
import { PlayerDashboardStatsSchema } from '@/lib/orpc/schema/playerDashboard';
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

const publicRouteTags = [
  {
    name: 'Leaderboards',
    description: 'Leaderboard listings and rating tier data.',
  },
  {
    name: 'Matches',
    description: 'Match lookups and detailed result records.',
  },
  {
    name: 'Players',
    description: 'Player profiles, beatmaps, and statistics.',
  },
  {
    name: 'Filtering',
    description: 'Filtering pipeline reports and review outcomes.',
  },
  {
    name: 'Tournaments',
    description: 'Tournament discovery and related metadata.',
  },
  {
    name: 'Stats',
    description: 'Platform-wide summaries and aggregated metrics.',
  },
] as const;

const PUBLIC_TAG_GROUP_NAME = '🛰 Public';

const PUBLIC_TAG_NORMALIZED = new Set<string>([
  ...publicRouteTags.map((tag) => tag.name.toLowerCase()),
  // Keep legacy support for the old "public" tag in case a route
  // has not been migrated yet.
  'public',
]);

const isPublicProcedure = ({
  contract,
}: {
  contract: { ['~orpc']?: { route?: { tags?: readonly string[] } } };
}) => {
  const tags = contract?.['~orpc']?.route?.tags;
  if (!Array.isArray(tags)) {
    return false;
  }

  return tags.some((tag) =>
    tag ? PUBLIC_TAG_NORMALIZED.has(tag.toLowerCase()) : false
  );
};

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
  ...publicRouteTags,
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
  const spec = await openAPIGenerator.generate(router, {
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
      PlayerDashboard: {
        schema: PlayerDashboardStatsSchema,
      },
      PlatformStats: {
        schema: PlatformStatsSchema,
      },
    },
    filter: (args) => isPublicProcedure(args),
  });

  type TagGroup = { name: string; tags: string[] };
  const publicTagNames = publicRouteTags.map((tag) => tag.name);
  const specWithGroups = spec as { 'x-tagGroups'?: TagGroup[] };
  const existingTagGroups = Array.isArray(specWithGroups['x-tagGroups'])
    ? specWithGroups['x-tagGroups']
    : [];

  const nextTagGroups: TagGroup[] = [
    {
      name: PUBLIC_TAG_GROUP_NAME,
      tags: publicTagNames,
    },
    ...existingTagGroups.filter((group) => group?.name !== PUBLIC_TAG_GROUP_NAME),
  ];

  return {
    ...spec,
    'x-tagGroups': nextTagGroups,
  };
};
