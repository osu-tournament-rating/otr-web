import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { call } from '@orpc/server';
import { eq, inArray } from 'drizzle-orm';

import { auth } from '../auth';
import { db } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import { deleteMyFriends } from '@/app/server/oRPC/procedures/userProcedures';
import { publicProcedure } from '@/app/server/oRPC/procedures/base';

const origin = 'http://localhost:3099';
const context = await auth.$context;
const createdPlayers: number[] = [];
const createdAuthUsers: string[] = [];
let nextOsuId = 2_000_000_000 + Math.floor(Math.random() * 100_000_000);

async function createPlayer(scopes: string[] = []) {
  const [player] = await db
    .insert(schema.players)
    .values({
      osuId: nextOsuId++,
      username: `identity-${nextOsuId}`,
      country: 'US',
    })
    .returning();
  createdPlayers.push(player.id);
  await db.insert(schema.users).values({ playerId: player.id, scopes });
  return player;
}

async function createIdentity() {
  const player = await createPlayer();
  const profile = {
    name: player.username,
    email: `identity-${crypto.randomUUID()}@otr.local`,
    emailVerified: false,
    playerId: player.id,
  };
  const created = await context.internalAdapter.createOAuthUser(profile, {
    providerId: 'osu',
    accountId: String(player.osuId),
  });
  createdAuthUsers.push(created.user.id);
  assert.equal((created.user as { playerId?: number }).playerId, player.id);
  const session = await context.internalAdapter.createSession(created.user.id);
  assert.ok(session);
  const signature = createHmac('sha256', context.secret)
    .update(session.token)
    .digest('base64');
  const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
  return { player, user: created.user, cookie };
}

function request(path: string, cookie: string, body?: unknown) {
  return auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  );
}

async function storedPlayerId(userId: string) {
  return (
    await db.query.auth_users.findFirst({
      where: eq(schema.auth_users.id, userId),
    })
  )?.playerId;
}

async function assertSession(cookie: string, playerId: number) {
  const response = await request('/get-session', cookie);
  assert.equal(response.status, 200);
  const session = await response.json();
  assert.equal(session.dbPlayer.id, playerId);
  assert.equal(session.user.playerId, playerId);
  assert.deepEqual(session.dbUser.scopes, []);
}

async function assertVictimPreserved(playerId: number) {
  assert.ok(
    await db.query.users.findFirst({
      where: eq(schema.users.playerId, playerId),
    })
  );
  assert.ok(
    await db.query.playerFriends.findFirst({
      where: eq(schema.playerFriends.playerId, playerId),
    })
  );
}

try {
  process.env.E2E_TEST_AUTH = 'false';
  const identity = await createIdentity();
  const victim = await createPlayer(['admin']);
  const friend = await createPlayer();
  await db
    .insert(schema.playerFriends)
    .values({ playerId: victim.id, friendId: friend.id });
  await assertSession(identity.cookie, identity.player.id);

  for (const playerId of [
    victim.id,
    String(victim.id),
    null,
    { id: victim.id },
  ]) {
    const response = await request('/update-user', identity.cookie, {
      playerId,
    });
    assert.equal(
      response.status,
      400,
      'client playerId updates must be rejected'
    );
    assert.equal(await storedPlayerId(identity.user.id), identity.player.id);
  }
  await assertSession(identity.cookie, identity.player.id);

  const profile = {
    name: 'Updated display name',
    image: 'https://example.com/avatar.png',
  };
  assert.equal(
    (await request('/update-user', identity.cookie, profile)).status,
    200
  );
  const updated = await db.query.auth_users.findFirst({
    where: eq(schema.auth_users.id, identity.user.id),
  });
  assert.equal(updated?.name, profile.name);
  assert.equal(updated?.image, profile.image);
  assert.equal(updated?.playerId, identity.player.id);

  await db
    .update(schema.auth_users)
    .set({ playerId: victim.id })
    .where(eq(schema.auth_users.id, identity.user.id));
  for (const e2eEnabled of ['false', 'true']) {
    process.env.E2E_TEST_AUTH = e2eEnabled;
    const response = await request('/get-session', identity.cookie);
    assert.equal(
      response.status,
      401,
      'a mismatched stored link must not produce session scopes'
    );
  }
  process.env.E2E_TEST_AUTH = 'false';

  assert.equal(
    (await request('/delete-user', identity.cookie, {})).status,
    401
  );
  const deleteToken = crypto.randomUUID();
  const deleteIdentifier = `delete-account-${deleteToken}`;
  await context.internalAdapter.createVerificationValue({
    identifier: deleteIdentifier,
    value: identity.user.id,
    expiresAt: new Date(Date.now() + 60_000),
  });
  try {
    assert.equal(
      (
        await request(
          `/delete-user/callback?token=${deleteToken}`,
          identity.cookie
        )
      ).status,
      401
    );
  } finally {
    await context.internalAdapter.deleteVerificationByIdentifier(
      deleteIdentifier
    );
  }
  await assertVictimPreserved(victim.id);
  assert.equal(
    await storedPlayerId(identity.user.id),
    victim.id,
    'mismatches are rejected without rewriting stored identity'
  );
  await assert.rejects(
    call(deleteMyFriends, undefined, {
      context: { headers: new Headers({ cookie: identity.cookie }) },
    })
  );
  await assertVictimPreserved(victim.id);

  const apiKey = await auth.api.createApiKey({
    headers: new Headers({ cookie: identity.cookie }),
    body: { name: 'Identity regression' },
  });
  const actorProcedure = publicProcedure.handler(
    ({ context }) => context.logging.actor
  );
  const actor = await call(actorProcedure, undefined, {
    context: {
      headers: new Headers({ authorization: `Bearer ${apiKey.key}` }),
    },
  });
  assert.equal(actor.playerId, null);
  assert.equal(actor.osuId, null);
  assert.equal(actor.osuUsername, null);
  assert.equal(actor.userId, identity.user.id);

  await db
    .update(schema.auth_users)
    .set({ playerId: identity.player.id })
    .where(eq(schema.auth_users.id, identity.user.id));
  await assertSession(identity.cookie, identity.player.id);
  const validActor = await call(actorProcedure, undefined, {
    context: {
      headers: new Headers({ authorization: `Bearer ${apiKey.key}` }),
    },
  });
  assert.equal(validActor.playerId, identity.player.id);
  assert.equal(validActor.osuId, String(identity.player.osuId));

  for (const account of [
    { providerId: 'osu', accountId: `0${identity.player.osuId}` },
    { providerId: 'osu', accountId: `${identity.player.osuId}.0` },
    { providerId: 'other', accountId: String(identity.player.osuId) },
  ]) {
    await db
      .update(schema.auth_accounts)
      .set(account)
      .where(eq(schema.auth_accounts.userId, identity.user.id));
    for (const enabled of ['false', 'true']) {
      process.env.E2E_TEST_AUTH = enabled;
      assert.equal(
        (await request('/get-session', identity.cookie)).status,
        401
      );
    }
  }
  process.env.E2E_TEST_AUTH = 'false';
  await db
    .update(schema.auth_accounts)
    .set({ providerId: 'osu', accountId: String(identity.player.osuId) })
    .where(eq(schema.auth_accounts.userId, identity.user.id));
  await assertSession(identity.cookie, identity.player.id);

  await db
    .insert(schema.playerFriends)
    .values({ playerId: identity.player.id, friendId: friend.id });
  assert.deepEqual(
    await call(deleteMyFriends, undefined, {
      context: { headers: new Headers({ cookie: identity.cookie }) },
    }),
    { success: true }
  );
  assert.equal(
    await db.query.playerFriends.findFirst({
      where: eq(schema.playerFriends.playerId, identity.player.id),
    }),
    undefined
  );
  await assertVictimPreserved(victim.id);
  assert.equal(
    (await request('/delete-user', identity.cookie, {})).status,
    200
  );
  assert.equal(await storedPlayerId(identity.user.id), undefined);
  assert.equal(
    await db.query.users.findFirst({
      where: eq(schema.users.playerId, identity.player.id),
    }),
    undefined
  );
  await assertVictimPreserved(victim.id);

  const e2ePlayer = await createPlayer();
  assert.equal(
    (await request('/e2e/sign-in', '', { playerId: e2ePlayer.id })).status,
    404
  );
  process.env.E2E_TEST_AUTH = 'true';
  const signIn = await request('/e2e/sign-in', '', { playerId: e2ePlayer.id });
  assert.equal(signIn.status, 200);
  const e2eUser = await signIn.json();
  createdAuthUsers.push(e2eUser.userId);
  const e2eCookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  await assertSession(e2eCookie, e2ePlayer.id);
  process.env.E2E_TEST_AUTH = 'false';
  assert.equal((await request('/get-session', e2eCookie)).status, 401);
  assert.equal((await request('/delete-user', e2eCookie, {})).status, 401);

  console.info(
    'Player identity auth, scope, deletion, API-key actor and E2E regressions passed.'
  );
} finally {
  if (createdAuthUsers.length > 0) {
    await db
      .delete(schema.auth_users)
      .where(inArray(schema.auth_users.id, createdAuthUsers));
  }
  if (createdPlayers.length > 0) {
    await db
      .delete(schema.playerFriends)
      .where(inArray(schema.playerFriends.playerId, createdPlayers));
    await db
      .delete(schema.users)
      .where(inArray(schema.users.playerId, createdPlayers));
    await db
      .delete(schema.players)
      .where(inArray(schema.players.id, createdPlayers));
  }
  await db.$client.end();
}
