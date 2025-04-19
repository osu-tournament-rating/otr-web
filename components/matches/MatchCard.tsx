import {
  AdminNoteRouteTarget,
  MatchDTO,
} from '@osu-tournament-rating/otr-api-client';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import Image from 'next/image';
import { formatUTCDate } from '@/lib/utils/date';
import AdminNoteView from '../admin-notes/AdminNoteView';
import MatchAdminView from './MatchAdminView';
import React, { Fragment } from 'react';
import { Card } from '../ui/card';

export default function MatchCard({ match }: { match: MatchDTO }) {
  const games = match.games ?? [];
  const hasGames = games.length > 0;
  const displayGames = hasGames ? games.slice(0, 15) : [];

  return (
    <Card className="mx-4 border-0 bg-secondary px-0.5 py-2 lg:px-0">
      <div className="relative mx-2 flex h-32 flex-col overflow-hidden rounded-xl font-sans">
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

        {/* Dimming */}
        <div className="absolute z-2 h-full w-full bg-black/40" />

        <div className="z-2 flex h-full w-full flex-col p-2 text-slate-50 dark:text-slate-100">
          {/* Top row with text shadow */}
          <div className="flex h-8 w-full items-center justify-between">
            <div className="text-shadow flex h-full flex-row items-center gap-4 whitespace-nowrap">
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
                notes={match.adminNotes ?? []}
                entity={AdminNoteRouteTarget.Match}
                entityId={match.id}
                entityDisplayName={match.name}
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
    </Card>
  );
}
