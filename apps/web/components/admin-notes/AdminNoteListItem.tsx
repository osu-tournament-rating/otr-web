'use client';

import { AdminNoteRouteTarget } from '@otr/core/osu';
import { PencilLineIcon, Trash } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hasAdminScope } from '@/lib/auth/roles';
import { toast } from 'sonner';
import { useSession } from '@/lib/hooks/useSession';
import { useRouter } from 'next/navigation';
import { AdminNote } from './types';
import { getAdminNoteMutations } from './adminNoteMutations';
import AdminNoteContent from './AdminNoteContent';

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

  const canModify = noteMutations != null && isAdmin && isNoteCreator;
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
    <AdminNoteContent
      note={note}
      footerActions={
        canModify ? (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit note"
                  className="size-4 text-muted-foreground"
                >
                  <PencilLineIcon />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Edit Note</AlertDialogTitle>
                  <AlertDialogDescription>
                    Change the text of this note.
                  </AlertDialogDescription>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete note"
                  className="size-4 text-destructive"
                >
                  <Trash />
                </Button>
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
        ) : undefined
      }
    />
  );
}
