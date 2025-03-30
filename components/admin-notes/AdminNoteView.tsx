'use client';

import { AdminNoteDTO, Roles } from '@osu-tournament-rating/otr-api-client';
import { StickyNote } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import AdminNoteCard from './AdminNoteCard';
import AdminNoteForm, { AdminNoteFormProps } from './AdminNoteForm';

export default function AdminNoteView({
  title,
  notes,
  props,
}: {
  title: string;
  notes: AdminNoteDTO[];
  props: AdminNoteFormProps;
}) {
  const [showNotification, setShowNotification] = useState(true);
  const { data: session } = useSession();

  const notify = !!notes.length;

  if (!session?.user?.scopes?.includes(Roles.Admin) && !notify) {
    return null;
  }

  const handleClick = () => {
    if (showNotification) {
      setShowNotification(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          onClick={handleClick}
          className="relative h-5 w-5"
          variant={'ghost'}
        >
          <StickyNote />
          {showNotification && notify && (
            <div className="absolute -top-1 -right-1">
              <span className="relative flex h-3 w-3">
                <span className="absolute h-4/6 w-4/6 animate-ping rounded-full bg-orange-400/75 duration-1500" />
                <span className="absolute h-4/6 w-4/6 rounded-full bg-orange-400" />
              </span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Notes</DialogTitle>
          <DialogDescription>
            Viewing admin notes for <span className="font-bold">{title}</span>
          </DialogDescription>
        </DialogHeader>
        <AdminNoteForm {...props} />
        {!!notes.length && (
          <ScrollArea className="max-h-48 space-y-4 px-2 not-odd:max-h-84">
            <div className="flex flex-col space-y-4">
              {notes.map((note) => (
                <AdminNoteCard key={note.id} note={note} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
