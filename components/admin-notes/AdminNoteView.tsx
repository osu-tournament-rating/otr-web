import { AdminNoteDTO } from '@osu-tournament-rating/otr-api-client';
import { StickyNote } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import AdminNoteCard from './AdminNoteCard';
import AdminNoteForm from './AdminNoteForm';

const notes: AdminNoteDTO[] = [
  {
    id: 0,
    created: new Date(),
    referenceId: 0,
    adminUser: {
      id: 0,
      player: {
        id: 0,
        osuId: 0,
        username: 'Cytusine',
        country: 'US',
        defaultRuleset: 0,
      },
    },
    note: 'This tournament sucked ass ong fr! This tournament sucked ass ong fr! This tournament sucked ass ong fr!',
  },
  {
    id: 1,
    created: new Date(),
    referenceId: 0,
    adminUser: {
      id: 0,
      player: {
        id: 0,
        osuId: 0,
        username: 'SourMongoose',
        country: 'US',
        defaultRuleset: 0,
      },
    },
    note: 'Something incredibly intelligent im sure :clueless: Something incredibly intelligent im sure :clueless:',
  },
];

export default async function AdminNoteView({
  name,
  // notes,
}: {
  name: string;
  // notes: AdminNoteDTO[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-5 w-5" variant={'ghost'}>
          <StickyNote />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Notes</DialogTitle>
          <DialogDescription>Viewing admin notes for {name}</DialogDescription>
        </DialogHeader>
        <AdminNoteForm />
        <div className="flex flex-col space-y-4">
          {notes.map((note) => (
            <AdminNoteCard key={note.id} note={note} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
