import { z } from 'zod';

export const ApiKeyMetadataSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  prefix: z.string().nullable(),
  start: z.string().nullable(),
  enabled: z.boolean(),
  rateLimitEnabled: z.boolean(),
  rateLimitMax: z.number().nullable(),
  rateLimitTimeWindow: z.number().nullable(),
  remaining: z.number().nullable(),
  requestCount: z.number(),
  lastRequest: z.string().nullable(),
  lastRefillAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApiKeyWithKeySchema = ApiKeyMetadataSchema.extend({
  key: z.string(),
});

export const ApiKeyWithSecretSchema = ApiKeyWithKeySchema;

export type ApiKeyMetadata = z.infer<typeof ApiKeyMetadataSchema>;
export type ApiKeyMetadataWithKey = z.infer<typeof ApiKeyWithKeySchema>;
export type ApiKeyWithSecret = z.infer<typeof ApiKeyWithSecretSchema>;
