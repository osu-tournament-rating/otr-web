import { openAPIHandler } from '@/app/server/openapi';

async function handle(request: Request) {
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
