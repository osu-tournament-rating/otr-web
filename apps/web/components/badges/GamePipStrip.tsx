'use client';

import {
  getRejectionMetadata,
  getWarningMetadata,
} from '@/components/badges/VerificationBadge';
import SimpleTooltip from '@/components/simple-tooltip';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import { cn } from '@/lib/utils';
import type { GameWithNotes } from '@/app/tournaments/[id]/columns';
import { VerificationStatus } from '@otr/core/osu';

const pipColors: Record<VerificationStatus, string> = {
  [VerificationStatus.None]: 'bg-muted-foreground/40',
  [VerificationStatus.PreRejected]: 'bg-warning/70',
  [VerificationStatus.PreVerified]: 'bg-success/50',
  [VerificationStatus.Rejected]: 'bg-destructive/80',
  [VerificationStatus.Verified]: 'bg-success',
};

export default function GamePipStrip({ games }: { games: GameWithNotes[] }) {
  if (games.length === 0) {
    return <span className="text-xs text-muted-foreground">No games</span>;
  }

  const sorted = [...games].sort(
    (a, b) =>
      new Date(a.startTime ?? 0).getTime() -
      new Date(b.startTime ?? 0).getTime()
  );

  return (
    <div className="flex items-center gap-0.5">
      {sorted.map((game, index) => {
        const warnings = getWarningMetadata(game.warningFlags, 'game');
        const rejections = getRejectionMetadata(game.rejectionReason, 'game');
        const { text } = VerificationStatusEnumHelper.getMetadata(
          game.verificationStatus
        );

        return (
          <SimpleTooltip
            key={game.id}
            content={
              <div className="text-xs">
                <p className="font-semibold">
                  Game {index + 1} · {text}
                </p>
                {[...warnings, ...rejections].map((entry, entryIndex) => (
                  <p key={entryIndex}>{entry.text}</p>
                ))}
              </div>
            }
          >
            <span
              className={cn(
                'h-2.5 w-1.5 rounded-xs transition-transform hover:scale-y-125',
                pipColors[game.verificationStatus],
                warnings.length > 0 && 'bg-warning'
              )}
            />
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
