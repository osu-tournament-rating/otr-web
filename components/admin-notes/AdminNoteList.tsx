'use client';

import {
  AdminNoteDTO,
  AdminNoteRouteTarget,
} from '@osu-tournament-rating/otr-api-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminNoteListItem from './AdminNoteListItem';

export default function AdminNotesList({
  entity,
  notes,
}: {
  entity: AdminNoteRouteTarget;
  notes: AdminNoteDTO[];
}) {
  return (
    <ScrollArea className="max-h-48 space-y-4 px-2">
      <div className="flex flex-col space-y-4">
        {notes.map((note) => (
          <AdminNoteListItem entity={entity} key={note.id} note={note} />
        ))}
      </div>
    </ScrollArea>
  );
}
