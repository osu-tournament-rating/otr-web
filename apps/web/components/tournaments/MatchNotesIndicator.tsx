import { StickyNote } from 'lucide-react';

import SimpleTooltip from '@/components/simple-tooltip';
import type {
  AdminNotePreview,
  GameWithNotes,
} from '@/app/tournaments/[id]/columns';

interface MatchNotesIndicatorProps {
  matchNotes: AdminNotePreview[];
  games: GameWithNotes[];
}

export default function MatchNotesIndicator({
  matchNotes,
  games,
}: MatchNotesIndicatorProps) {
  const gamesWithNotes = games.filter((game) => game.adminNotes.length > 0);
  const hasMatchNotes = matchNotes.length > 0;
  const hasGameNotes = gamesWithNotes.length > 0;

  if (!hasMatchNotes && !hasGameNotes) {
    return null;
  }

  const content = (
    <div className="max-w-xs space-y-2 text-xs">
      {hasMatchNotes && (
        <div>
          <div className="mb-1 font-semibold text-yellow-600 dark:text-yellow-400">
            Match notes
          </div>
          {matchNotes.map((note, index) => (
            <div key={index} className="mb-1 last:mb-0">
              <div>{note.note}</div>
              <div className="text-muted-foreground">
                — {note.adminUsername}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasGameNotes && (
        <div>
          <div className="mb-1 font-semibold text-purple-600 dark:text-purple-400">
            Game notes
          </div>
          {gamesWithNotes.map((game) =>
            game.adminNotes.map((note, index) => (
              <div key={`${game.id}-${index}`} className="mb-1 last:mb-0">
                <div>{note.note}</div>
                <div className="text-muted-foreground">
                  — {note.adminUsername}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <SimpleTooltip content={content} side="right" align="start">
      <div className="relative flex-shrink-0">
        <StickyNote className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
        {hasMatchNotes && (
          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" />
        )}
        {hasGameNotes && (
          <div className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
        )}
      </div>
    </SimpleTooltip>
  );
}
