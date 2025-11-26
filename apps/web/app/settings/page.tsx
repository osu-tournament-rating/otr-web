import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Suspense } from 'react';

import AccountDeletionClient from '@/app/settings/AccountDeletionClient';
import ApiKeySettingsClient from '@/app/settings/ApiKeySettingsClient';
import FriendsSyncClient from '@/app/settings/FriendsSyncClient';
import { auth } from '@/lib/auth/auth';
import { orpc } from '@/lib/orpc/orpc';
import { getFriendCount } from '@/lib/db/player-friends';

export default async function SettingsPage() {
  const headersList = await headers();
  const appSession = await auth.api.getSession({ headers: headersList });

  if (!appSession) {
    redirect('/unauthorized');
  }

  const keys = await orpc.apiClients.getKeys();

  const playerId = appSession.dbPlayer?.id;
  const friendCount = playerId ? await getFriendCount(playerId) : 0;

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Settings className="text-primary size-6" />
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>
      </header>

      <div className="space-y-8">
        <Suspense fallback={null}>
          <FriendsSyncClient friendCount={friendCount} />
        </Suspense>
        <ApiKeySettingsClient
          initialKeys={keys}
          rateLimit={{ maxRequests: 60, timeWindowMs: 60_000 }}
        />
        <AccountDeletionClient />
      </div>
    </div>
  );
}
