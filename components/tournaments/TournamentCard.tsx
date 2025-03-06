'use client';

import {
  Roles,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  rulesetString,
  verificationStatusString,
} from '@/lib/utils/enum-utils';
import VerificationBadge from '../verification/VerificationBadge';
import SimpleTooltip from '../simple-tooltip';
import { useSession } from 'next-auth/react';
import { EditIcon } from 'lucide-react';
import { Button } from '../ui/button';

export default function TournamentCard({
  tournament,
  displayStatusText
}: {
  tournament: TournamentCompactDTO;
  displayStatusText: boolean
}) {
  const date = new Date(tournament.startTime);
  const { data: session } = useSession();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div className="flex gap-3">
            <SimpleTooltip
              content={verificationStatusString(tournament.verificationStatus)}
            >
              <VerificationBadge
                verificationStatus={tournament.verificationStatus}
                text={displayStatusText}
              />
            </SimpleTooltip>
            <CardTitle>{tournament.name}</CardTitle>
          </div>
          {session?.user?.scopes?.includes(Roles.Admin) && (
            <div className="flex">
              <Button className="h-5 w-5" variant={'ghost'}>
                <EditIcon />
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          <div className="flex font-mono justify-between">
            <p>
              {tournament.abbreviation} • {rulesetString(tournament.ruleset)} •{' '}
              {tournament.lobbySize}v{tournament.lobbySize} • #
              {tournament.rankRangeLowerBound}+
            </p>
            <p className="text-xs">{date.toUTCString()}</p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
