import {
  AdminNoteRouteTarget,
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { ScoreGradeEnumHelper } from '@/lib/enums';
import Image from 'next/image';
import ModIconset from '../icons/ModIconset';
import { cn } from '@/lib/utils';
import ScoreAdminView from '../scores/ScoreAdminView';
import AdminNoteView from '../admin-notes/AdminNoteView';
import Link from 'next/link';

export default function ScoreCard({
  score,
  player,
  won = false,
}: {
  score: GameScoreDTO;
  player?: PlayerCompactDTO;
  won?: boolean;
}) {
  return (
    <div
      data-team={Team[score.team]}
      className="team-flex-row border-secondary-foreground/15 **:z-10 group relative flex overflow-clip rounded-xl border"
    >
      {/* Background team color overlay */}
      <div className="bg-[var(--team-color)]/10 absolute z-[2] size-full" />

      {/* Team color on the side of the card */}
      <div className="bg-[var(--team-color)]/70 duration-250 relative z-[3] h-full w-1.5 transition-all ease-in-out group-hover:w-7">
        <div className="duration-250 absolute inset-0 flex flex-col items-center justify-center space-y-3 opacity-0 transition-opacity ease-in-out group-hover:opacity-100">
          <AdminNoteView
            notes={score.adminNotes}
            entity={AdminNoteRouteTarget.GameScore}
            entityId={score.id}
          />
          <ScoreAdminView score={score} />
        </div>
      </div>

      {/* Content */}
      <div className="flex size-full flex-col gap-2 px-2">
        {/* Top row */}
        <div className="team-flex-row flex flex-1 items-center justify-between">
          {/* Player */}
          <div className="team-flex-row flex h-full w-fit items-center justify-start gap-2">
            <span className="relative aspect-[70/50] h-1/2">
              <Image
                src={`https://osu.ppy.sh/images/flags/${player?.country}.png`}
                alt={`country ${player?.country}`}
                fill
              />
            </span>
            <Link href={`/players/${player?.id}`}>
              <span className="font-bold">{player?.username}</span>
            </Link>
          </div>
          {/* Grade / Mods / Score */}
          <div className="team-flex-row flex h-full items-center justify-center gap-2">
            <ModIconset
              className="team-flex-row flex h-full max-w-20 items-center justify-end"
              iconClassName={cn(
                'max-h-6',
                // Clear left margin
                'md:group-data-[team="Blue"]:not-first:ml-0 md:group-data-[team="Blue"]:peer-hover:not-first:ml-0 md:group-data-[team="Blue"]:hover:not-first:ml-0',
                // Add right margin
                'md:group-data-[team="Blue"]:not-first:-mr-4 md:group-data-[team="Blue"]:peer-hover:not-first:-mr-2 md:group-data-[team="Blue"]:hover:not-first:-mr-2'
              )}
              mods={score.mods}
            />
            <span>{ScoreGradeEnumHelper.getMetadata(score.grade).text}</span>
            <span
              className={cn(
                'text-(--score-text-color) text-lg',
                won && 'font-bold'
              )}
            >
              {score.score.toLocaleString()}
            </span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="team-flex-row flex flex-1 items-center justify-between gap-6">
          {/* 300 / 100 / 50 / Miss */}
          <div className="team-flex-row flex items-center justify-start gap-4">
            <div className="performance-item">
              <span className="label">{300}</span>
              <span className="value">{score.count300}x</span>
            </div>
            <div className="performance-item">
              <span className="label">{100}</span>
              <span className="value">{score.count100}x</span>
            </div>
            <div className="performance-item">
              <span className="label">{50}</span>
              <span className="value">{score.count50}x</span>
            </div>
            <div className="performance-item">
              <span className="label">Miss</span>
              <span className="value">{score.countMiss}x</span>
            </div>
          </div>
          {/* Acc / Combo */}
          <div className="team-flex-row flex items-center justify-end gap-4">
            <div className="performance-item">
              <span className="label">Combo</span>
              <span className="value">{score.maxCombo}x</span>
            </div>
            <div className="performance-item">
              <span className="label">Accuracy</span>
              <span className="value">{score.accuracy.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
