'use client';

import { AdminNoteRouteTarget } from '@/lib/osu/enums';
import { PencilLineIcon, Trash } from 'lucide-react';
import { iconButtonStyle } from '../buttons/IconButton';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { hasAdminScope } from '@/lib/auth/roles';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { useSession } from '@/lib/hooks/useSession';
import { useRouter } from 'next/navigation';
import { AdminNote } from './types';
import { getAdminNoteMutations } from './adminNoteMutations';

export default function AdminNoteListItem({
  note,
  entity,
}: {
  note: AdminNote;
  entity: AdminNoteRouteTarget;
}) {
  const session = useSession();
  const router = useRouter();

  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const noteMutations = getAdminNoteMutations(entity);
  const isNoteCreator = note.adminUser.id === (session?.userId ?? -1);

  // Restrict edit/delete functionality to admin users working on their own notes
  const showModificationButtons =
    noteMutations != null && isAdmin && isNoteCreator;
  const [editedNote, setEditedNote] = useState(note.note);

  const handleDelete = async () => {
    if (!noteMutations) {
      toast.error('Deleting notes for this entity is not available yet.');
      return;
    }

    try {
      await noteMutations.delete(note.id);
      toast.success('Note deleted successfully');
      router.refresh();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const handleEdit = async () => {
    if (!noteMutations) {
      toast.error('Editing notes for this entity is not available yet.');
      return;
    }

    try {
      await noteMutations.update(note.id, editedNote);
      toast.success('Note updated successfully');
      router.refresh();
    } catch {
      toast.error('Failed to update note');
    }
  };

  return (
    <div className="flex flex-col">
      <p className="text-foreground">{note.note}</p>
      <div className="flex items-end gap-2">
        <p className="text-sm text-muted-foreground">
          By{' '}
          <Link
            href={`/players/${note.adminUser.player.id}`}
            className="font-semibold text-primary"
          >
            {note.adminUser.player.username}
          </Link>{' '}
          on {format(new Date(note.created), 'MMM dd, yyyy')}
        </p>
        {showModificationButtons && (
          <>
            {/* Edit Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PencilLineIcon
                  className={iconButtonStyle('text-muted-foreground')}
                />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Edit Note</AlertDialogTitle>
                </AlertDialogHeader>
                <Textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  className="min-h-16"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleEdit}
                    disabled={!editedNote.trim()}
                  >
                    Save
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {/* Delete Confirmation Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Trash className={iconButtonStyle('text-destructive')} />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this note?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
