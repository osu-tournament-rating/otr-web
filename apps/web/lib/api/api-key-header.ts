const BEARER_PREFIX = 'Bearer ';

export type ApiKeyHeaderResult = { headers: Headers } | { response: Response };

const createUnauthorizedResponse = (message: string): Response => {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': 'Bearer realm="otr_api"',
    },
  });
};

/**
 * Checks a REST API request's key and returns the headers the procedures
 * should see, or a 401 response. A Bearer authorization passes through as is.
 * An `x-api-key` value comes back as a Bearer authorization, the only form the
 * procedures read. The request itself is never rebuilt: Next hands route
 * handlers a Proxy that Node's `Request` constructor can't copy.
 */
export const normalizeApiKeyHeader = (headers: Headers): ApiKeyHeaderResult => {
  const authorization = headers.get('authorization');

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

    return { headers };
  }

  const rawApiKey = headers.get('x-api-key');
  const candidate = rawApiKey?.trim();

  if (!candidate) {
    return {
      response: createUnauthorizedResponse(
        'An API key is required to access this endpoint.'
      ),
    };
  }

  const forwardedHeaders = new Headers(headers);
  forwardedHeaders.set('authorization', `${BEARER_PREFIX}${candidate}`);

  return { headers: forwardedHeaders };
};
