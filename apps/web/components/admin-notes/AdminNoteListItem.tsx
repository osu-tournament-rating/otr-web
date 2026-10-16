'use client';

import { AdminNoteRouteTarget } from '@otr/core/osu';
import { PencilLine, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/kit/controls/Button';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import { IconButton } from '@/components/kit/controls/IconButton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { hasAdminScope } from '@/lib/auth/roles';
import { useSession } from '@/lib/hooks/useSession';

import AdminNoteContent from './AdminNoteContent';
import { getAdminNoteMutations } from './adminNoteMutations';
import { AdminNote } from './types';

/**
 * One note in the admin notes list. Its author can edit it in place or
 * delete it after a confirmation.
 */
export default function AdminNoteListItem({
  note,
  entity,
}: {
  note: AdminNote;
  entity: AdminNoteRouteTarget;
}) {
  const session = useSession();
  const router = useRouter();
  const editorId = useId();

  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const noteMutations = getAdminNoteMutations(entity);
  const isNoteCreator = note.adminUser.id === (session?.userId ?? -1);
  const canModify = noteMutations != null && isAdmin && isNoteCreator;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.note);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!noteMutations || !draft.trim()) return;

    setSaving(true);
    try {
      await noteMutations.update(note.id, draft);
      toast.success('Note updated successfully');
      setEditing(false);
      router.refresh();
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={editorId}>Edit note</Label>
        <Textarea
          id={editorId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-16"
          disabled={saving}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              setDraft(note.note);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            pending={saving}
            disabled={!draft.trim()}
            onClick={() => void save()}
          >
            Save note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminNoteContent
        note={note}
        footerActions={
          canModify ? (
            <>
              <IconButton
                label="Edit note"
                icon={PencilLine}
                onClick={() => {
                  setDraft(note.note);
                  setEditing(true);
                }}
              />
              <IconButton
                label="Delete note"
                icon={Trash2}
                destructive
                onClick={() => setDeleting(true)}
              />
            </>
          ) : undefined
        }
      />
      {canModify ? (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title="Delete this note?"
          description="This action cannot be undone."
          confirmLabel="Delete note"
          pendingLabel="Deleting…"
          errorText="Failed to delete note"
          onConfirm={async () => {
            if (!noteMutations) return;
            await noteMutations.delete(note.id);
            toast.success('Note deleted successfully');
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
