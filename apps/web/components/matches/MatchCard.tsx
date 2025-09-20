import Link from 'next/link';
import React, { Fragment } from 'react';
import { ExternalLink, Users, Gamepad2 } from 'lucide-react';

import { AdminNoteRouteTarget } from '@otr/core/osu';
import { MatchDetail } from '@/lib/orpc/schema/match';
import { formatUTCDate } from '@/lib/utils/date';
import VerificationBadge from '../badges/VerificationBadge';
import AdminNoteView from '../admin-notes/AdminNoteView';
import MatchAdminView from './MatchAdminView';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';
import BeatmapBackground from '../games/BeatmapBackground';

export default function MatchCard({ match }: { match: MatchDetail }) {
  const games = match.games ?? [];
  const hasGames = games.length > 0;
  const displayGames = hasGames ? games.slice(0, 15) : [];
  // Calculate unique players count
  const uniquePlayerIds = new Set(
    games.flatMap((game) => game.scores.map((score) => score.playerId))
  );
  const uniquePlayersCount = uniquePlayerIds.size;

  return (
    <Card className="bg-secondary border-0 p-2">
      <div className="relative flex h-32 flex-col overflow-hidden rounded-xl">
        {/* Background collage */}
        <div className="z-1 blur-xs absolute inset-0 flex overflow-hidden">
          {hasGames ? (
            <>
              {displayGames.map((game, index) => (
                <Fragment key={game.id}>
                  <div
                    className="group relative h-full"
                    style={{
                      flex: '1 0 auto',
                      clipPath:
                        index === 0
                          ? 'polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%)'
                          : index === displayGames.length - 1
                            ? 'polygon(20px 0, 100% 0, 100% 100%, 0 100%)'
                            : 'polygon(20px 0, 100% 0, calc(100% - 20px) 100%, 0 100%)',
                      marginLeft: index > 0 ? '-20px' : '0',
                    }}
                  >
                    <BeatmapBackground
                      beatmapsetId={game.beatmap?.beatmapset?.osuId}
                      alt={`${game.beatmap?.beatmapset?.title} cover`}
                    />
                  </div>
                </Fragment>
              ))}
            </>
          ) : (
            <div className="bg-card/50 absolute inset-0" />
          )}
        </div>

        {/* Enhanced overlay for better text contrast */}
        <div className="z-2 absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />

        <div className="z-3 flex h-full w-full flex-col p-2 text-white">
          {/* Top row */}
          <div className="flex h-8 w-full items-center justify-between gap-2">
            <div className="flex h-full flex-row items-center gap-2 overflow-hidden sm:gap-4">
              <VerificationBadge
                verificationStatus={match.verificationStatus}
                warningFlags={match.warningFlags}
                rejectionReason={match.rejectionReason}
                entityType="match"
                displayText
                size="small"
              />
              <span className="text-xs text-white/80 sm:text-sm">
                {match.startTime
                  ? formatUTCDate(new Date(match.startTime))
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <SimpleTooltip content="View match on osu!">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-white/20 hover:text-white"
                >
                  <Link
                    href={`https://osu.ppy.sh/community/matches/${match.osuId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View match on osu! website"
                  >
                    <ExternalLink className="h-3 w-3 text-white/70 hover:text-white" />
                  </Link>
                </Button>
              </SimpleTooltip>
              <AdminNoteView
                notes={match.adminNotes}
                entity={AdminNoteRouteTarget.Match}
                entityId={match.id}
                entityDisplayName={match.name}
              />
              <MatchAdminView match={match} />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex w-full flex-1 flex-row justify-between gap-2">
            <div className="max-w-3/4 flex flex-1 flex-col justify-end overflow-hidden">
              <span className="flex gap-1 truncate text-xs text-white/80 sm:text-sm">
                <span>Played in</span>
                <Link
                  className="font-semibold text-white transition-colors hover:text-white/80"
                  href={`/tournaments/${match.tournament?.id}`}
                >
                  {match.tournament?.name}
                </Link>
              </span>
              <Link href={`/matches/${match.id}`}>
                <p className="truncate text-sm font-bold text-white drop-shadow-sm transition-colors hover:text-white/80 sm:text-xl">
                  {match.name}
                </p>
              </Link>
            </div>
            <div className="min-w-1/8 flex flex-col items-end justify-end gap-1">
              {uniquePlayersCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-white/80 sm:text-sm">
                  <Users className="h-3 w-3" />
                  <span>
                    {uniquePlayersCount} player
                    {uniquePlayersCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {games.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-white/80 sm:text-sm">
                  <Gamepad2 className="h-3 w-3" />
                  <span>
                    {games.length} game{games.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
