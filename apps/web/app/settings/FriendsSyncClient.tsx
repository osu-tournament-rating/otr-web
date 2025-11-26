'use client';

import { Loader2, RefreshCw, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authClient } from '@/lib/auth/auth-client';
import { orpc } from '@/lib/orpc/orpc';

interface FriendsSyncClientProps {
  friendCount: number;
}

export default function FriendsSyncClient({
  friendCount: initialFriendCount,
}: FriendsSyncClientProps) {
  const [friendCount, setFriendCount] = useState(initialFriendCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const handleDeleteFriends = async () => {
    setIsDeleting(true);
    try {
      await orpc.users.deleteMyFriends();
      setFriendCount(0);
      toast.success('Friends list cleared');
      setIsDeleteDialogOpen(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to delete friends. Please try again.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="text-primary size-6" />
          <CardTitle>Friends</CardTitle>
        </div>
        <CardDescription>
          Sync your osu! friends list to filter the leaderboard by friends.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {friendCount > 0
            ? `${friendCount} friend${friendCount !== 1 ? 's' : ''} synced.`
            : 'Your friends list has not been synced yet.'}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSyncFriends} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Sync Friends
              </>
            )}
          </Button>

          {friendCount > 0 && (
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 size-4" />
                  Delete Friends
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your friends list?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {friendCount} friend
                    {friendCount !== 1 ? 's' : ''} from your synced list. You
                    can sync them again at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteFriends}
                    className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/40 text-white"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Friends'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
