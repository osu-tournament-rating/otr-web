import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import type { BetterAuthOptions } from 'better-auth';
import { eq } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import type { DatabaseClient } from '@/lib/db';
import {
  API_KEY_LIMIT_ERROR_CODE,
  API_KEY_LIMIT_MESSAGE,
  MAX_API_KEYS_PER_USER,
} from './api-key-policy';

const adapterConfig = {
  provider: 'pg',
  usePlural: true,
  schema: {
    ...schema,
    user: schema.auth_users,
    account: schema.auth_accounts,
    verification: schema.auth_verifications,
    session: schema.auth_sessions,
    apikeys: schema.apiKeys,
  },
} as const;

export const authDatabaseAdapter = (database: DatabaseClient) => {
  return (options: BetterAuthOptions) => {
    const adapter = drizzleAdapter(database, adapterConfig)(options);
    const create = adapter.create;

    // Mutate this instance so its transaction callback also uses the guarded create.
    adapter.create = async (input) => {
      if (input.model !== 'apikey' && input.model !== 'apikeys') {
        return create(input);
      }

      const referenceId = input.data.referenceId;
      if (typeof referenceId !== 'string' || referenceId.length === 0) {
        throw new APIError('BAD_REQUEST', {
          message: 'API key owner is required',
        });
      }

      return database.transaction(
        async (tx) => {
          // Lock the owner, including when they have no keys, across server processes.
          await tx
            .select({ id: schema.auth_users.id })
            .from(schema.auth_users)
            .where(eq(schema.auth_users.id, referenceId))
            .for('update');

          const count = await tx.$count(
            schema.apiKeys,
            eq(schema.apiKeys.referenceId, referenceId)
          );
          if (count >= MAX_API_KEYS_PER_USER) {
            throw new APIError('CONFLICT', {
              code: API_KEY_LIMIT_ERROR_CODE,
              message: API_KEY_LIMIT_MESSAGE,
            });
          }

          return drizzleAdapter(tx, adapterConfig)(options).create(input);
        },
        { isolationLevel: 'read committed' }
      );
    };

    return adapter;
  };
};
