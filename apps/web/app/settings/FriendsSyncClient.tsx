'use client';

import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth/auth-client';

interface FriendsSyncClientProps {
  friendCount: number;
}

export default function FriendsSyncClient({
  friendCount,
}: FriendsSyncClientProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('friendsSync') === 'complete') {
      toast.success('Friends list synced successfully');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  const handleSyncFriends = async () => {
    setIsSyncing(true);
    try {
      await authClient.signIn.oauth2({
        providerId: 'osu',
        scopes: ['identify', 'public', 'friends.read'],
        callbackURL: '/settings?friendsSync=complete',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      toast.error(message);
      setIsSyncing(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Friends Leaderboard</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Sync your osu! friends list to filter the leaderboard by friends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="text-primary size-6" />
            <CardTitle>Friends Sync</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {friendCount > 0
              ? `${friendCount} friend${friendCount !== 1 ? 's' : ''} synced.`
              : 'Your friends list has not been synced. Click below to authorize access.'}
          </p>

          <Button onClick={handleSyncFriends} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                {friendCount > 0 ? 'Resync Friends' : 'Sync Friends'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
