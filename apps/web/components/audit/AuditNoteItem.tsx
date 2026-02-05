import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import type { AuditAdminNote } from '@/lib/orpc/schema/audit';
import { formatRelativeTime } from './formatRelativeTime';

export default function AuditNoteItem({
  note,
}: {
  note: AuditAdminNote;
}): React.JSX.Element {
  return (
    <div
      id={`note-${note.id}`}
      className="border-border group relative border-l-2 py-2 pl-4"
    >
      <div className="absolute -left-[5px] top-3 h-2 w-2 rounded-full bg-amber-400" />

      <div className="rounded-md border border-amber-200/50 bg-amber-50/50 p-2 dark:border-amber-700/30 dark:bg-amber-900/10">
        <div className="flex items-center gap-1.5 text-xs">
          <MessageSquare className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            Note
          </span>
          <span className="text-muted-foreground">&middot;</span>
          {note.adminUser ? (
            <Link
              href={`/players/${note.adminUser.playerId}`}
              className="text-primary hover:underline"
            >
              {note.adminUser.username ?? `User ${note.adminUser.id}`}
            </Link>
          ) : (
            <span className="text-muted-foreground italic">Unknown</span>
          )}
          <span className="text-muted-foreground">&middot;</span>
          <time
            className="text-muted-foreground"
            dateTime={note.created}
            title={new Date(note.created).toLocaleString()}
          >
            {formatRelativeTime(note.created)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{note.note}</p>
      </div>
    </div>
  );
}
