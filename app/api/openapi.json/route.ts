import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { router } from '@/app/server/oRPC/router';
import { UserSchema } from '@/lib/orpc/schema/user';

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export async function GET() {
  const spec = await generator.generate(router, {
    info: {
      title: 'o!TR API',
      version: '1.0.0',
      description: 'osu! Tournament Rating API',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    tags: [
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
        description: 'May be used by admins only'
      }
    ],
    commonSchemas: {
      User: {
        schema: UserSchema,
      }
    }
  });

  return Response.json(spec);
}
