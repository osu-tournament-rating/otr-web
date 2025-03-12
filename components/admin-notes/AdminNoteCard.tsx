import { AdminNoteDTO } from '@osu-tournament-rating/otr-api-client';
import { PencilLineIcon, Trash } from 'lucide-react';
import { iconButtonStyle } from '../buttons/IconButton';
import { Separator } from '../ui/separator';

export default function AdminNoteCard({ note }: { note: AdminNoteDTO }) {
  return (
    <div className="flex gap-2">
      <Separator orientation="vertical" />
      <div>
        <p className="text-foreground">{note.note}</p>
        <div className="flex items-end gap-2">
          <p className="text-sm text-muted">
            Added by{' '}
            <span className="font-bold">{note.adminUser.player.username}</span>{' '}
            on{' '}
            <span className="font-bold">
              {new Date(note.created).toDateString()}
            </span>
          </p>
          <PencilLineIcon className={iconButtonStyle('text-muted')} />
          <Trash className={iconButtonStyle('text-muted')} />
        </div>
      </div>
    </div>
  );
}
