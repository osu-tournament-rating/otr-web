'use client';

import {
  AdminNoteRouteTarget,
  AuditEntityType,
  ReportEntityType,
} from '@otr/core/osu';
import {
  Flag,
  GitMerge,
  History,
  Music2,
  NotebookPen,
  PencilLine,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AdminNotesDialog } from '@/components/admin-notes/AdminNotesDialog';
import { ConfirmDialog } from '@/components/kit/controls/ConfirmDialog';
import { RowActionsMenu } from '@/components/kit/controls/RowActionsMenu';
import { Badge } from '@/components/kit/status/Badge';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { DELETE_CASCADE_DESCRIPTION } from '@/components/matches/adminFormFields';
import { ReportDialog } from '@/components/reports/ReportDialog';
import { entityTypeToSlug } from '@/lib/audit-entity-types';
import { hasAdminScope } from '@/lib/auth/roles';
import { useSession } from '@/lib/hooks/useSession';
import { formatBadgeCount } from '@/lib/kit/status/count';
import { orpc } from '@/lib/orpc/orpc';
import type { Game } from '@/lib/orpc/schema/match';

import GameEditDialog from './GameEditDialog';
import MergeGameDialog from './MergeGameDialog';

/**
 * The one actions button on a game card's cover: audit history, the beatmap
 * on osu! and report for everyone, admin notes when there are any (with a
 * dot on the button, as the old notes button had), and the admin's edit,
 * merge and delete actions.
 */
export default function GameActionsMenu({
  game,
  gameName,
}: {
  game: Game;
  /** "Title [Difficulty]", or "Game 123" for a deleted beatmap; names the menu. */
  gameName: string;
}) {
  const session = useSession();
  const isAdmin = hasAdminScope(session?.scopes ?? []);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [viewingNotes, setViewingNotes] = useState(false);

  const noteCount = game.adminNotes.length;
  const beatmapOsuId = game.beatmap?.osuId;

  return (
    <>
      <span className="relative inline-flex shrink-0">
        <RowActionsMenu
          onArt
          itemName={gameName}
          data-testid="game-actions"
          actions={[
            isAdmin && {
              label: 'Edit game',
              icon: PencilLine,
              onSelect: () => setEditing(true),
            },
            (isAdmin || noteCount > 0) && {
              label: 'Admin notes',
              icon: NotebookPen,
              trailing:
                noteCount > 0 ? (
                  <Badge size="sm">{formatBadgeCount(noteCount)}</Badge>
                ) : undefined,
              onSelect: () => setViewingNotes(true),
            },
            {
              label: 'View audit history',
              icon: History,
              href: `/audit/${entityTypeToSlug(AuditEntityType.Game)}/${game.id}`,
            },
            Boolean(beatmapOsuId) && {
              label: 'View beatmap on osu! website',
              icon: Music2,
              href: `https://osu.ppy.sh/b/${beatmapOsuId}`,
              external: true,
            },
            session && {
              label: 'Report an issue',
              icon: Flag,
              onSelect: () => setReporting(true),
            },
            isAdmin && {
              label: 'Merge games',
              icon: GitMerge,
              group: 'data',
              onSelect: () => setMerging(true),
            },
            isAdmin && {
              label: 'Delete game',
              icon: Trash2,
              destructive: true,
              onSelect: () => setDeleting(true),
            },
          ]}
        />
        {noteCount > 0 ? (
          <NotificationDot
            placement="corner"
            label="Has admin notes"
            className="ring-1 ring-black/40"
          />
        ) : null}
      </span>

      {session ? (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          entityType={ReportEntityType.Game}
          entityId={game.id}
          entityDisplayName={gameName}
        />
      ) : null}
      {isAdmin || noteCount > 0 ? (
        <AdminNotesDialog
          open={viewingNotes}
          onOpenChange={setViewingNotes}
          notes={game.adminNotes}
          entity={AdminNoteRouteTarget.Game}
          entityId={game.id}
          entityDisplayName={gameName}
        />
      ) : null}

      {isAdmin ? (
        <>
          <GameEditDialog
            game={game}
            open={editing}
            onOpenChange={setEditing}
          />
          <MergeGameDialog
            game={game}
            open={merging}
            onOpenChange={setMerging}
          />
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title="Delete this game?"
            description={DELETE_CASCADE_DESCRIPTION}
            confirmLabel="Delete game"
            pendingLabel="Deleting…"
            errorText="Failed to delete game"
            onConfirm={async () => {
              await orpc.games.admin.delete({ id: game.id });
              toast.success('Game deleted successfully');
              router.refresh();
            }}
          />
        </>
      ) : null}
    </>
  );
}
