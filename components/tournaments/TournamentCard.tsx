'use client';

import {
  Roles,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { Card, CardDescription, CardHeader } from '../ui/card';
import {
  rulesetString,
  verificationStatusString,
} from '@/lib/utils/enum-utils';
import VerificationBadge from '../verification/VerificationBadge';
import SimpleTooltip from '../simple-tooltip';
import { useSession } from 'next-auth/react';
import { EditIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { formatUTCDate } from '@/lib/utils/date-utils';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import TournamentEditForm from './TournamentEditForm';
import { DialogContent } from '@radix-ui/react-dialog';

export default function TournamentCard({
  tournament,
  displayStatusText,
}: {
  tournament: TournamentCompactDTO;
  displayStatusText: boolean;
}) {
  const startDate = new Date(tournament.startTime);
  const endDate = new Date(tournament.endTime);
  const { data: session } = useSession();
  const commaNumber = require('comma-number');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div>
              <SimpleTooltip
                content={verificationStatusString(
                  tournament.verificationStatus
                )}
              >
                <VerificationBadge
                  verificationStatus={tournament.verificationStatus}
                  text={displayStatusText}
                />
              </SimpleTooltip>
            </div>
            <div>
              <p className="text-muted-foreground">{tournament.abbreviation}</p>
            </div>
            <div>
              <p className="font-bold">{tournament.name}</p>
            </div>
          </div>

          {session?.user?.scopes?.includes(Roles.Admin) && (
            <div className="flex">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-5 w-5" variant={'ghost'}>
                    <EditIcon />
                  </Button>
                </DialogTrigger>
                <DialogContent className="fixed inset-0 bg-black/80 flex items-center justify-center p-6">
                  <div className="bg-background w-[450px] p-6 rounded-lg">
                    <DialogHeader className="sm:max-w-md">
                      <DialogTitle>Edit Tournament</DialogTitle>
                      <DialogDescription>
                        Editing {tournament.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                      <TournamentEditForm tournament={tournament} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <CardDescription>
          <div className="flex font-mono justify-between">
            <p>
              {rulesetString(tournament.ruleset)} • {tournament.lobbySize}v
              {tournament.lobbySize} •{' '}
              {commaNumber(tournament.rankRangeLowerBound)}+
            </p>
            <p className="text-xs">
              {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
            </p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
