'use client';

import {
  AdminNoteDTO,
  Roles,
  AdminNoteRouteTarget,
} from '@osu-tournament-rating/otr-api-client';
import { PencilLineIcon, Trash } from 'lucide-react';
import { useSession } from 'next-auth/react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { deleteNote, updateNote } from '@/lib/actions/admin-notes';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminNoteCard({
  note,
  entity,
}: {
  note: AdminNoteDTO;
  entity: AdminNoteRouteTarget;
}) {
  const { data: session } = useSession();
  const showButtons = session?.user?.scopes?.includes(Roles.Admin);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedNote, setEditedNote] = useState(note.note);

  const handleDelete = async () => {
    try {
      await deleteNote({
        noteId: note.id,
        entity,
      });
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Failed to delete note', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleEdit = async () => {
    try {
      await updateNote({
        noteId: note.id,
        entity,
        body: editedNote,
      });
      toast.success('Note updated successfully');
      setShowEditDialog(false);
    } catch (error) {
      toast.error('Failed to update note');
      console.error('Failed to update note', error);
    }
  };

  return (
    <div className="flex gap-2 font-sans">
      <div>
        <p className="text-foreground">{note.note}</p>
        <div className="flex items-end gap-2">
          <p className="text-sm text-muted-foreground">
            Added by{' '}
            <Link
              href={`/players/${note.adminUser.player.id}`}
              className="font-semibold text-primary"
            >
              {note.adminUser.player.username}
            </Link>{' '}
            on {format(new Date(note.created), 'MMM dd, yyyy')}
          </p>
          {showButtons && (
            <>
              <PencilLineIcon
                className={iconButtonStyle('text-muted')}
                onClick={() => setShowEditDialog(true)}
              />
              <Trash
                className={iconButtonStyle('text-muted')}
                onClick={() => setShowDeleteDialog(true)}
              />
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedNote}
            onChange={(e) => setEditedNote(e.target.value)}
            className="min-h-32"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editedNote.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
