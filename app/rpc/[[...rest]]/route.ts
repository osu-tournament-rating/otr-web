import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { router } from '@/app/server/oRPC/router';

const handler = new OpenAPIHandler(router);

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: request.headers, // Pass request headers as initial context
    },
  });

  return response ?? new Response('Not found', { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
