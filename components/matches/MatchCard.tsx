import {
  AdminNoteRouteTarget,
  MatchDTO,
} from '@osu-tournament-rating/otr-api-client';
import { Card, CardHeader } from '../ui/card';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import Image from 'next/image';
import { formatUTCDate } from '@/lib/utils/date';
import AdminNoteView from '../admin-notes/AdminNoteView';
import MatchAdminView from './MatchAdminView';
import React from 'react';

export default function MatchCard({ match }: { match: MatchDTO }) {
  const games = match.games ?? [];
  const hasGames = games.length > 0;
  const displayGames = hasGames ? games.slice(0, 15) : [];

  return (
    <Card>
      <CardHeader>
        <div className="relative flex h-32 flex-col overflow-hidden rounded-xl font-sans">
          {/* Background collage */}
          <div className="absolute inset-0 z-1 flex overflow-hidden">
            {hasGames ? (
              <>
                {displayGames.map((game, index) => (
                  <React.Fragment key={game.id}>
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
                      {/* Enhanced glow divider */}
                      {index > 0 && (
                        <>
                          <div className="absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-black/70 to-transparent" />
                          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-r from-white/30 via-white/60 to-transparent mix-blend-overlay" />
                          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-r from-white/10 to-transparent blur-sm" />
                        </>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
          </div>

          {/* Enhanced background dim with gradient */}
          <div className="absolute inset-0 z-2 h-full w-full bg-gradient-to-t from-black/60 via-black/30 to-black/10 dark:from-black/70 dark:via-black/40 dark:to-black/20" />

          {/* Content with improved contrast */}
          <div className="z-2 flex h-full w-full flex-col p-2 text-slate-50 dark:text-slate-100">
            {/* Top row with text shadow */}
            <div className="flex h-8 w-full items-center justify-between">
              <div className="flex h-full flex-row items-center gap-4 whitespace-nowrap [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
                <VerificationBadge
                  verificationStatus={match.verificationStatus}
                  displayText
                />
                <Link href={`/matches/${match.id}`}>
                  <span className="font-bold transition-colors hover:text-white">
                    {match.name}
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-2 [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
                <span className="flex gap-1">
                  {formatUTCDate(new Date(match.startTime ?? ''))}
                </span>
                <AdminNoteView
                  props={{
                    entity: AdminNoteRouteTarget.Match,
                    entityId: match.id,
                    entityName: match.name,
                  }}
                  notes={match.adminNotes ?? []}
                />
                <MatchAdminView match={match} />
              </div>
            </div>

            {/* Bottom row with stronger contrast */}
            <div className="flex w-full flex-1 flex-row justify-between">
              <div className="flex max-w-3/4 flex-1 flex-col justify-end [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%)]">
                <span className="text-lg">
                  Played in{' '}
                  <Link
                    className="font-bold transition-colors hover:text-white"
                    href={`/tournaments/${match.tournament?.id}`}
                  >
                    {match.tournament?.name}
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
