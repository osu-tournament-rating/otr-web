'use server';

import { z } from 'zod';
import { OTR_HEADERS } from '@/auth';
import { headers } from 'next/headers';

const customHeaderSchema = z.object(
  Object.fromEntries(
    Object.entries(OTR_HEADERS).map(([k, v]) => [
      k,
      z.enum(v).optional().catch(undefined),
    ])
  ) as unknown as {
    [key in keyof typeof OTR_HEADERS]: z.ZodOptional<
      z.ZodSchema<(typeof OTR_HEADERS)[key][number]>
    >;
  }
);

/**
 * Gets the value of an internal header
 * @param header Header
 */
export async function getCustomHeaderValue<K extends keyof typeof OTR_HEADERS>(
  header: K
): Promise<(typeof OTR_HEADERS)[K][number] | undefined> {
  return customHeaderSchema.parse(
    Object.fromEntries((await headers()).entries())
  )[header];
}
