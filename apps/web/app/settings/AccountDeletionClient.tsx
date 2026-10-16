'use client';

import { Trash2, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { SETTINGS_COPY } from '@/app/settings/settings-copy';
import { Button } from '@/components/kit/controls/Button';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import { Callout } from '@/components/kit/feedback/Callout';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { authClient } from '@/lib/auth/auth-client';
import { orpc } from '@/lib/orpc/orpc';

/**
 * The danger zone: a danger callout whose red outline button opens the one
 * solid red confirm.
 */
export default function AccountDeletionClient() {
  const router = useRouter();

  const deleteAccount = async () => {
    await orpc.users.deleteMe();
    toast.success('Account deleted successfully');

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
        },
      },
    });
  };

  return (
    <Panel data-testid="settings-account-deletion-section">
      <SectionHeader icon={UserX} title="Delete account" />
      <PanelBody>
        <Callout
          tone="danger"
          action={
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  icon={Trash2}
                  data-testid="settings-delete-account-button"
                >
                  Delete my account
                </Button>
              }
              title="Delete your account?"
              description="This action cannot be undone."
              confirmLabel="Delete account"
              pendingLabel="Deleting…"
              errorText="Failed to delete account. Try again."
              onConfirm={deleteAccount}
            />
          }
        >
          {SETTINGS_COPY.deleteAccount}
        </Callout>
      </PanelBody>
    </Panel>
  );
}
