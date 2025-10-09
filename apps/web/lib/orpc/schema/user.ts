import { users } from '@otr/core/db/schema';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';

import { CreatedUpdatedOmit } from './constants';

export const UserSchema = createSelectSchema(users).omit(CreatedUpdatedOmit);

export const CurrentUserSchema = z.object({
  player: z.object({
    id: z.number().int(),
    username: z.string(),
    osuId: z.number().int(),
    country: z.string(),
  }),
  scopes: z.array(z.string()),
  userId: z.number().int().nullable(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const ADMIN_BAN_REASONS = [
  'API abuse',
  'Submissions abuse',
  'Requests abuse',
] as const;

export const AdminBanReasonSchema = z.enum(ADMIN_BAN_REASONS);

export const AdminBanUserInputSchema = z.object({
  playerId: z.number().int().positive(),
  reason: AdminBanReasonSchema,
});

export const AdminBanUserResponseSchema = z.object({
  success: z.boolean(),
});

export const AdminAuthUserSchema = z.object({
  id: z.string(),
  playerId: z.number().int(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.string().nullable(),
});

export const AdminBanUserLookupResponseSchema = z.object({
  exists: z.boolean(),
  authUser: AdminAuthUserSchema.nullable(),
});

export const AdminUserApiKeysInputSchema = z.object({
  playerId: z.number().int().positive(),
});

export type AdminUserApiKeysInput = z.infer<typeof AdminUserApiKeysInputSchema>;

export type AdminBanReason = z.infer<typeof AdminBanReasonSchema>;
export type AdminAuthUser = z.infer<typeof AdminAuthUserSchema>;
export type AdminBanUserLookupResponse = z.infer<
  typeof AdminBanUserLookupResponseSchema
>;

export const AdminPlayerSearchInputSchema = z.object({
  query: z.string().trim().min(2, 'Enter at least two characters to search'),
});

export const AdminPlayerSearchResultSchema = z.object({
  playerId: z.number().int(),
  username: z.string(),
  osuId: z.number().int(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
});

export const AdminPlayerSearchResponseSchema =
  AdminPlayerSearchResultSchema.array();

export type AdminPlayerSearchInput = z.infer<
  typeof AdminPlayerSearchInputSchema
>;
export type AdminPlayerSearchResult = z.infer<
  typeof AdminPlayerSearchResultSchema
>;
