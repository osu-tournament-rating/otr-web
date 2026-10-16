'use client';

import { AdminNoteRouteTarget } from '@otr/core/osu';
import { NotebookPen } from 'lucide-react';
import { useState } from 'react';

import {
  IconButton,
  type IconButtonProps,
} from '@/components/kit/controls/IconButton';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { hasAdminScope } from '@/lib/auth/roles';
import { useSession } from '@/lib/hooks/useSession';

import { AdminNotesDialog } from './AdminNotesDialog';
import { AdminNote } from './types';

export {
  AdminNotesDialog,
  type AdminNotesDialogProps,
} from './AdminNotesDialog';

interface AdminNoteViewProps {
  notes: AdminNote[];
  entity: AdminNoteRouteTarget;
  entityId: number;
  /** Falls back to the entity's type and ID. */
  entityDisplayName?: string;
  variant?: IconButtonProps['variant'];
  size?: IconButtonProps['size'];
  /** @deprecated On cover art, pass `variant="overlay"`. */
  darkMode?: boolean;
}

/**
 * The "Admin notes" button with its dialog, for admins, and for everyone
 * once an entity has notes. A dot marks existing notes until the dialog is
 * first opened. Inside an AdminMenu or RowActionsMenu, add an "Admin notes"
 * item instead and open `AdminNotesDialog` from it.
 */
export default function AdminNoteView({
  notes,
  entity,
  entityId,
  entityDisplayName,
  variant,
  size,
  darkMode = false,
}: AdminNoteViewProps) {
  const session = useSession();
  const [seen, setSeen] = useState(false);

  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const hasNotes = notes.length > 0;

  if (!isAdmin && !hasNotes) {
    return null;
  }

  return (
    <AdminNotesDialog
      notes={notes}
      entity={entity}
      entityId={entityId}
      entityDisplayName={entityDisplayName}
      onOpenChange={(open) => {
        if (open) setSeen(true);
      }}
      trigger={
        <IconButton
          icon={NotebookPen}
          label="Admin notes"
          variant={variant ?? (darkMode ? 'overlay' : 'ghost')}
          size={size}
          className="relative"
        >
          {hasNotes && !seen ? (
            <NotificationDot placement="corner" label="Has admin notes" />
          ) : null}
        </IconButton>
      }
    />
  );
}
