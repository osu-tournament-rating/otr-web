'server-only';

import { ORPCError } from '@orpc/client';
import { notFound } from 'next/navigation';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

/**
 * Parse route params using the provided schema.
 * Falls back to Next's not-found boundary when validation fails.
 */
export function parseParamsOrNotFound<TSchema extends ZodTypeAny>(
  schema: TSchema,
  rawParams: unknown
): z.infer<TSchema> {
  const result = schema.safeParse(rawParams);

  if (!result.success) {
    notFound();
  }

  return result.data;
}

/**
 * Execute an oRPC call and surface Next's not-found boundary
 * whenever the procedure throws a NOT_FOUND error.
 */
export async function fetchOrpcOrNotFound<T>(
  resolver: () => Promise<T>
): Promise<T> {
  try {
    return await resolver();
  } catch (error) {
    if (error instanceof ORPCError && error.code === 'NOT_FOUND') {
      notFound();
    }

    throw error;
  }
}

/**
 * Execute an oRPC call and return undefined when the response is NOT_FOUND.
 * Useful for metadata and other optional data lookups.
 */
export async function fetchOrpcOptional<T>(
  resolver: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await resolver();
  } catch (error) {
    if (error instanceof ORPCError && error.code === 'NOT_FOUND') {
      return undefined;
    }

    throw error;
  }
}
