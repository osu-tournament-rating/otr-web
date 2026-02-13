import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import type { AuditAdminNote } from '@/lib/orpc/schema/audit';
import RelativeTime from './RelativeTime';

export default function AuditNoteItem({
  note,
}: {
  note: AuditAdminNote;
}): React.JSX.Element {
  return (
    <div
      data-testid="audit-note-item"
      id={`note-${note.id}`}
      className="border-border group border-b border-l-2 border-l-amber-400 bg-amber-50/30 px-3 py-2.5 transition-colors hover:bg-amber-50/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Note
        </span>
        <span className="text-muted-foreground text-xs">&middot;</span>
        {note.adminUser ? (
          note.adminUser.playerId ? (
            <Link
              href={`/players/${note.adminUser.playerId}`}
              className="text-primary text-sm hover:underline"
            >
              {note.adminUser.username ?? `User ${note.adminUser.id}`}
            </Link>
          ) : (
            <span className="text-foreground text-sm">
              {note.adminUser.username ?? `User ${note.adminUser.id}`}
            </span>
          )
        ) : (
          <span className="text-muted-foreground text-sm italic">Unknown</span>
        )}
        <span className="flex-1" />
        <RelativeTime
          dateString={note.created}
          className="text-muted-foreground shrink-0 text-xs"
        />
      </div>

      {/* Note content */}
      <p className="mt-1.5 whitespace-pre-wrap pl-6 text-sm">{note.note}</p>
    </div>
  );
}
