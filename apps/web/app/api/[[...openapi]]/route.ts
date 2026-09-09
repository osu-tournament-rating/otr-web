import { openAPIHandler } from '@/app/server/openapi';
import { extractApiKey } from '@/lib/auth/api-key-header';
import { ORPCError } from '@orpc/server';

const createUnauthorizedResponse = (message: string): Response => {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': 'Bearer realm="otr_api"',
    },
  });
};

async function handle(request: Request) {
  if (request.method !== 'OPTIONS') {
    try {
      if (!extractApiKey(request.headers)) {
        return createUnauthorizedResponse(
          'An API key is required to access this endpoint.'
        );
      }
    } catch (error) {
      if (error instanceof ORPCError) {
        return createUnauthorizedResponse(error.message);
      }
      throw error;
    }
  }

  const result = await openAPIHandler.handle(request, {
    prefix: '/api',
    context: {
      headers: request.headers,
    },
  });

  if (result.matched) {
    return result.response ?? new Response(null, { status: 204 });
  }

  return new Response('Not found', { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
