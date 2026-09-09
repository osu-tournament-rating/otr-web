import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { isE2eAuthEnabled } from './e2e-test-auth-plugin';

export const OSU_PROVIDER_ID = 'osu';

export async function getVerifiedPlayer(userId: string) {
  const authUser = await db.query.auth_users.findFirst({
    where: eq(schema.auth_users.id, userId),
    columns: { id: true },
    with: { player: true },
  });

  if (!authUser?.player) {
    return null;
  }

  const account = await db.query.auth_accounts.findFirst({
    where: and(
      eq(schema.auth_accounts.userId, userId),
      eq(schema.auth_accounts.providerId, OSU_PROVIDER_ID),
      eq(schema.auth_accounts.accountId, String(authUser.player.osuId))
    ),
    columns: { id: true },
  });

  if (account) {
    return authUser.player;
  }

  // The explicit E2E sign-in endpoint provisions users without OAuth accounts.
  if (isE2eAuthEnabled()) {
    const anyAccount = await db.query.auth_accounts.findFirst({
      where: eq(schema.auth_accounts.userId, userId),
      columns: { id: true },
    });
    if (!anyAccount) {
      return authUser.player;
    }
  }

  return null;
}
