'use client';

import { RefreshCw, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/kit/controls/Button';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { authClient } from '@/lib/auth/auth-client';
import { formatCountOf } from '@/lib/kit/format/number';
import { orpc } from '@/lib/orpc/orpc';

interface FriendsSyncClientProps {
  friendCount: number;
}

export default function FriendsSyncClient({
  friendCount: initialFriendCount,
}: FriendsSyncClientProps) {
  const [friendCount, setFriendCount] = useState(initialFriendCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('friendsSync') === 'complete') {
      toast.success('Friends list synced successfully');
      window.history.replaceState({}, '', '/settings');
      router.refresh();
    }
  }, [searchParams, router]);

  const handleSyncFriends = async () => {
    setIsSyncing(true);
    try {
      await authClient.signIn.social({
        provider: 'osu',
        scopes: ['identify', 'public', 'friends.read'],
        callbackURL: '/settings?friendsSync=complete',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      toast.error(message);
      setIsSyncing(false);
    }
  };

  const friends = formatCountOf(friendCount, 'friend');

  return (
    <Panel data-testid="settings-friends-sync-section">
      <SectionHeader icon={Users} title="Friends" />
      <PanelBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">
            Sync your osu! friends list to filter the leaderboard by friends.
          </p>
          <p>
            {friendCount > 0
              ? `${friends} synced.`
              : 'Your friends list has not been synced yet.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            icon={RefreshCw}
            pending={isSyncing}
            onClick={() => void handleSyncFriends()}
            data-testid="settings-sync-friends-button"
          >
            {isSyncing ? 'Redirecting…' : 'Sync friends'}
          </Button>

          {friendCount > 0 ? (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" icon={Trash2}>
                  Delete friends
                </Button>
              }
              title="Delete your friends list?"
              description={`This will remove all ${friends} from your synced list. You can sync them again at any time.`}
              confirmLabel="Delete friends"
              pendingLabel="Deleting…"
              errorText="Failed to delete friends. Try again."
              onConfirm={async () => {
                await orpc.users.deleteMyFriends();
                setFriendCount(0);
                toast.success('Friends list cleared');
              }}
            />
          ) : null}
        </div>
      </PanelBody>
    </Panel>
  );
}
