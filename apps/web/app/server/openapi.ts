import { OpenAPIGenerator } from '@orpc/openapi';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import {
  experimental_ZodSmartCoercionPlugin as ZodSmartCoercionPlugin,
  ZodToJsonSchemaConverter,
} from '@orpc/zod/zod4';

import { router } from '@/app/server/oRPC/router';
import { UserSchema } from '@/lib/orpc/schema/user';

const schemaConverters = [new ZodToJsonSchemaConverter()];

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

const tags = [
  {
    name: 'public',
    description: 'Public endpoints that do not require authentication',
  },
  {
    name: 'authenticated',
    description: 'Endpoints that require authentication',
  },
  {
    name: 'admin',
    description: 'May be used by admins only',
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
    commonSchemas: {
      User: {
        schema: UserSchema,
      },
    },
    filter: (args) => isPublicProcedure(args),
  });
};
