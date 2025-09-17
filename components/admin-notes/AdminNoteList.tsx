'use client';

import {
  AdminNoteDTO,
  AdminNoteRouteTarget,
} from '@osu-tournament-rating/otr-api-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminNoteListItem from './AdminNoteListItem';
import { TournamentAdminNote } from '@/lib/orpc/schema/tournament';

type AdminNote = AdminNoteDTO | TournamentAdminNote;

export default function AdminNotesList({
  entity,
  notes,
}: {
  entity: AdminNoteRouteTarget;
  notes: AdminNote[];
}) {
  return (
    <ScrollArea className="max-h-36 space-y-3 px-2">
      <div className="flex flex-col space-y-3">
        {notes.map((note) => (
          <AdminNoteListItem entity={entity} key={note.id} note={note} />
        ))}
      </div>
    </ScrollArea>
  );
}
