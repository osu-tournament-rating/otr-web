'use client';

import { AdminNoteDTO, Roles } from '@osu-tournament-rating/otr-api-client';
import { PencilLineIcon, Trash } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { iconButtonStyle } from '../buttons/IconButton';

export default function AdminNoteCard({ note }: { note: AdminNoteDTO }) {
  const { data: session } = useSession();
  const showButtons = session?.user?.scopes?.includes(Roles.Admin);

  return (
    <div className="flex gap-2">
      {/* <Separator orientation="vertical" /> */}
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
          {showButtons && (
            <>
              <PencilLineIcon className={iconButtonStyle('text-muted')} />
              <Trash className={iconButtonStyle('text-muted')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
