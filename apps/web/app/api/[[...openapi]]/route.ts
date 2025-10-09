import { openAPIHandler } from '@/app/server/openapi';

const BEARER_PREFIX = 'Bearer ';

type NormalizedRequest = {
  request: Request;
};

type UnauthorizedResult = {
  response: Response;
};

const createUnauthorizedResponse = (message: string): Response => {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': 'Bearer realm="otr_api"',
    },
  });
};

const normalizeAuthorizationHeader = (
  request: Request
): NormalizedRequest | UnauthorizedResult => {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    const trimmed = authorization.trim();

    if (!trimmed.toLowerCase().startsWith(BEARER_PREFIX.toLowerCase())) {
      return {
        response: createUnauthorizedResponse(
          'Provide the API key using the Authorization: Bearer <key> header.'
        ),
      };
    }

    const token = trimmed.slice(BEARER_PREFIX.length).trim();

    if (!token) {
      return {
        response: createUnauthorizedResponse('API key is missing.'),
      };
    }

    return { request };
  }

  // Check x-api-key as an alternative to Bearer authorization
  const rawApiKey = request.headers.get('x-api-key');
  const candidate = rawApiKey?.trim();

  if (!candidate) {
    return {
      response: createUnauthorizedResponse(
        'An API key is required to access this endpoint.'
      ),
    };
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('authorization', `${BEARER_PREFIX}${candidate}`);

  return {
    request: new Request(request, { headers: forwardedHeaders }),
  };
};

async function handle(initialRequest: Request) {
  let request = initialRequest;

  if (request.method !== 'OPTIONS') {
    const normalization = normalizeAuthorizationHeader(request);

    if ('response' in normalization) {
      return normalization.response;
    }

    request = normalization.request;
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
