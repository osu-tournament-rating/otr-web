'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, User } from 'lucide-react';
import {
  PlayerTournamentStatsBaseDTO,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TRText from '../rating/TRText';

interface TournamentTopPerformersProps {
  playerStats: PlayerTournamentStatsBaseDTO[];
  className?: string;
  ruleset: Ruleset;
}

export default function TournamentTopPerformers({
  playerStats,
  className,
  ruleset,
}: TournamentTopPerformersProps) {
  const topPerformers = playerStats
    .filter((stats) => stats.matchesPlayed >= 3)
    .sort((a, b) => b.averageMatchCost - a.averageMatchCost)
    .slice(0, 3);

  if (topPerformers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No qualifying performers found (min. 3 matches)
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topPerformers.map((stats, index) => {
          const position = index + 1;
          const trChange = stats.averageRatingDelta;

          return (
            <div
              key={stats.player.id}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {getPositionIcon(position)}
                <span className="text-sm font-medium text-muted-foreground">
                  #{position}
                </span>
              </div>

              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://a.ppy.sh/${stats.player.osuId}`}
                  alt={`${stats.player.username}'s avatar`}
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/players/${stats.player.id}?ruleset=${ruleset}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {stats.player.username}
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-4">
                <div className="text-right">
                  <div className="font-medium">
                    {stats.averageMatchCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Match Cost
                  </div>
                </div>

                <div className="hidden text-right md:block">
                  <div className="font-medium">
                    {stats.averagePlacement.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg. Placement
                  </div>
                </div>

                <div className="hidden text-right md:block">
                  <div className="font-medium">
                    {(stats.gamesPlayed / stats.matchesPlayed).toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg. Games
                  </div>
                </div>

                <div className="hidden text-right sm:block">
                  <div
                    className={`font-medium ${trChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {trChange >= 0 ? '+' : ''}
                    {trChange.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <TRText />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
