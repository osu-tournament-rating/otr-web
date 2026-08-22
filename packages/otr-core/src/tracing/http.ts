import { SpanKind } from '@opentelemetry/api';
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_SERVER_ADDRESS,
  ATTR_URL_FULL,
} from '@opentelemetry/semantic-conventions';

import { withSpan } from './tracer';

const INSTRUMENTED = Symbol.for('otr.tracing.fetch');

const readRequest = (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : null;
  const url = request ? request.url : String(input);
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();

  return { url, method };
};

/**
 * Gives outbound calls — the osu! and osu!track APIs — their own client spans.
 * Next.js already traces its own fetches, so this is for the worker.
 */
export function instrumentFetch(): void {
  const original = globalThis.fetch as typeof fetch & {
    [INSTRUMENTED]?: boolean;
  };

  if (!original || original[INSTRUMENTED]) {
    return;
  }

  const traced = async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method } = readRequest(input, init);
    let host: string | undefined;
    try {
      host = new URL(url).host;
    } catch {
      host = undefined;
    }

    return withSpan(
      `${method} ${host ?? 'fetch'}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [ATTR_HTTP_REQUEST_METHOD]: method,
          [ATTR_URL_FULL]: url,
          [ATTR_SERVER_ADDRESS]: host,
        },
      },
      async (span) => {
        const response = await original(input, init);
        span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
        return response;
      }
    );
  };

  Object.defineProperty(traced, INSTRUMENTED, { value: true });
  globalThis.fetch = traced as typeof fetch;
}
