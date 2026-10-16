'use client';

import { MessageSquare } from 'lucide-react';
import type { AuditAdminNote } from '@/lib/orpc/schema/audit';
import { RelativeTime } from '@/components/kit/format/RelativeTime';
import { AuditActor, AuditRowLine } from './AuditRow';

/** An admin note in an entity's audit history, as a neutral row. */
export default function AuditNoteItem({
  note,
}: {
  note: AuditAdminNote;
}): React.JSX.Element {
  return (
    <li
      data-testid="audit-note-item"
      id={`note-${note.id}`}
      className="scroll-mt-24 px-4 py-3 transition-colors"
    >
      <AuditRowLine
        icon={
          <MessageSquare
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        }
        sentence={
          <>
            <AuditActor user={note.adminUser} fallback="Unknown" /> added a note
          </>
        }
        meta={<RelativeTime date={note.created} />}
      />
      <p className="mt-1.5 pl-7 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
        {note.note}
      </p>
    </li>
  );
}
