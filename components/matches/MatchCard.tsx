import {
  AdminNoteRouteTarget,
  MatchDTO,
} from '@osu-tournament-rating/otr-api-client';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Users, Gamepad2 } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils/date';
import AdminNoteView from '../admin-notes/AdminNoteView';
import MatchAdminView from './MatchAdminView';
import React, { Fragment } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import SimpleTooltip from '../simple-tooltip';

export default function MatchCard({ match }: { match: MatchDTO }) {
  const games = match.games ?? [];
  const hasGames = games.length > 0;
  const displayGames = hasGames ? games.slice(0, 15) : [];

  // Calculate unique players count
  const uniquePlayerIds = new Set(
    games.flatMap((game) => game.scores.map((score) => score.playerId))
  );
  const uniquePlayersCount = uniquePlayerIds.size;

  return (
    <Card className="mx-4 border-0 bg-secondary px-0.5 py-2 lg:px-0">
      <div className="relative mx-2 flex h-32 flex-col overflow-hidden rounded-xl">
        {/* Background collage */}
        <div className="absolute inset-0 z-1 flex overflow-hidden blur-xs">
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
                    {game.beatmap?.beatmapset?.osuId && (
                      <Image
                        src={`https://assets.ppy.sh/beatmaps/${game.beatmap.beatmapset.osuId}/covers/cover@2x.jpg`}
                        alt={`${game.beatmap.beatmapset.title} cover`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    )}
                  </div>
                </Fragment>
              ))}
            </>
          ) : (
            <div className="absolute inset-0 bg-card/50" />
          )}
        </div>

        {/* Enhanced overlay for better text contrast */}
        <div className="absolute inset-0 z-2 h-full w-full rounded-xl bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />

        <div className="z-3 flex h-full w-full flex-col p-2 text-white">
          {/* Top row */}
          <div className="flex h-8 w-full items-center justify-between gap-2">
            <div className="flex h-full flex-row items-center gap-2 overflow-hidden sm:gap-4">
              <VerificationBadge
                verificationStatus={match.verificationStatus}
                displayText
              />
              <span className="text-xs text-white/80 sm:text-sm">
                {formatUTCDate(new Date(match.startTime ?? ''))}
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
                notes={match.adminNotes ?? []}
                entity={AdminNoteRouteTarget.Match}
                entityId={match.id}
                entityDisplayName={match.name}
              />
              <MatchAdminView match={match} />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex w-full flex-1 flex-row justify-between gap-2">
            <div className="flex max-w-3/4 flex-1 flex-col justify-end overflow-hidden">
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
                <span className="truncate text-sm font-bold text-white drop-shadow-sm transition-colors hover:text-white/80 sm:text-xl">
                  {match.name}
                </span>
              </Link>
            </div>
            <div className="flex min-w-1/8 flex-col items-end justify-end gap-1">
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
