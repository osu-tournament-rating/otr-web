import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { NextRequest } from 'next/server';

import { openAPIHandler } from '@/app/server/openapi';

import { GET } from '../route';

/**
 * What Next hands a route handler: a Proxy around a NextRequest that reads
 * every property, and binds every method, on the target (proxyNextRequest in
 * next/dist/server/route-modules/app-route/module.js). Node's Request
 * constructor can't copy it, so the route must never rebuild the request.
 * Bun's can, so these tests check that the route hands the request on as is.
 */
const nextRouteRequest = (url: string, headers: HeadersInit) =>
  new Proxy(new NextRequest(url, { headers }), {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

describe('OpenAPI route', () => {
  const handle = spyOn(openAPIHandler, 'handle');

  afterEach(() => {
    handle.mockClear();
  });

  it('passes an x-api-key request on unchanged, with the key as a Bearer authorization', async () => {
    const request = nextRouteRequest('http://localhost/api/does-not-exist', {
      'x-api-key': 'key-123',
    });

    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(handle).toHaveBeenCalledTimes(1);

    const [handledRequest, options] = handle.mock.calls[0]!;
    expect(handledRequest).toBe(request);
    expect(options?.context?.headers.get('authorization')).toBe(
      'Bearer key-123'
    );
  });

  it('passes a Bearer request on with its own headers', async () => {
    const request = nextRouteRequest('http://localhost/api/does-not-exist', {
      authorization: 'Bearer key-123',
    });

    const response = await GET(request);

    expect(response.status).toBe(404);

    const [handledRequest, options] = handle.mock.calls[0]!;
    expect(handledRequest).toBe(request);
    expect(options?.context?.headers).toBe(request.headers);
  });

  it('answers a request without a key with a 401', async () => {
    const response = await GET(
      nextRouteRequest('http://localhost/api/does-not-exist', {})
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe(
      'Bearer realm="otr_api"'
    );
    expect(handle).not.toHaveBeenCalled();
  });
});
