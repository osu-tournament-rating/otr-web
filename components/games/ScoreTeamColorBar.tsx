'use client';

import {
  AdminNoteRouteTarget,
  GameScoreDTO,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { useSession } from '@/lib/hooks/useSession';
import { cn } from '@/lib/utils';
import AdminNoteView from '../admin-notes/AdminNoteView';
import ScoreAdminView from '../scores/ScoreAdminView';

interface ScoreAdminControlsProps {
  score: GameScoreDTO;
}

export default function ScoreTeamColorBar({ score }: ScoreAdminControlsProps) {
  const session = useSession();
  const isAdmin = session?.scopes?.includes(Roles.Admin);

  return (
    <div
      className={cn(
        'relative z-[3] h-full w-1.5 bg-[var(--team-color)]/70',
        isAdmin ? 'transition-all duration-250 ease-in-out group-hover:w-7' : ''
      )}
    >
      {isAdmin && (
        <div
          className={
            'absolute inset-0 flex flex-col items-center justify-center space-y-3 opacity-0 transition-opacity duration-250 ease-in-out group-hover:opacity-100'
          }
        >
          <AdminNoteView
            notes={score.adminNotes}
            entity={AdminNoteRouteTarget.GameScore}
            entityId={score.id}
          />
          <ScoreAdminView score={score} />
        </div>
      )}
    </div>
  );
}
