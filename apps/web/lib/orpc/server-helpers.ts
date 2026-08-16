'server-only';

import { ORPCError } from '@orpc/client';
import { notFound } from 'next/navigation';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

/** Parses route params, falling back to Next's not-found boundary. */
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

/** Runs an oRPC call, turning NOT_FOUND into Next's not-found boundary. */
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

/** Runs an oRPC call, returning undefined on NOT_FOUND. */
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
