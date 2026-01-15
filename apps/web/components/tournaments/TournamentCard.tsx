import { RulesetEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import { AdminNoteRouteTarget, ReportEntityType } from '@otr/core/osu';
import Link from 'next/link';
import {
  Users,
  Target,
  Calendar,
  UserPlus,
  History,
  ExternalLink,
} from 'lucide-react';

import {
  TournamentAdminNote,
  TournamentDetail,
  TournamentListItem,
} from '@/lib/orpc/schema/tournament';
import { TournamentReportableFields } from '@/lib/orpc/schema/report';

import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import { LazerBadge } from '../badges/LazerBadge';
import RulesetIcon from '../icons/RulesetIcon';
import ReportButton from '../reports/ReportButton';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import TournamentAdminView from './TournamentAdminView';
import SimpleTooltip from '../simple-tooltip';

type TournamentCardData =
  | (TournamentListItem & { adminNotes?: TournamentAdminNote[] })
  | TournamentDetail;

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

export default function TournamentCard({
  tournament,
  variant = 'list',
  titleIsLink = false,
  displayStatusText = false,
  allowAdminView = false,
}: {
  tournament: TournamentCardData;

  /** Display variant: 'list' for tournament lists, 'detail' for detail page header */
  variant?: 'list' | 'detail';

  /** If the title links to the tournament's page (list variant only) */
  titleIsLink?: boolean;

  /** If the verification status icon includes text */
  displayStatusText?: boolean;

  /** If the button to open the admin view is present (list variant only, detail always shows) */
  allowAdminView?: boolean;
}) {
  const isDetail = variant === 'detail';
  const startDate = tournament.startTime
    ? new Date(tournament.startTime)
    : null;
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null;
  const adminNotes = tournament.adminNotes ?? [];
  const canShowAdminControls =
    (isDetail || allowAdminView) && 'playerTournamentStats' in tournament;
  const showAdminButtons = isDetail || allowAdminView;
  const forumUrl = 'forumUrl' in tournament ? tournament.forumUrl : null;

  const buttonSize = isDetail ? 'h-8 w-8' : 'h-6 w-6';
  const iconSize = isDetail ? 'h-4 w-4' : 'h-3 w-3';

  const TitleElement = isDetail ? 'h1' : 'h2';
  const titleClasses = isDetail
    ? 'text-xl font-bold leading-tight sm:text-2xl md:text-3xl'
    : 'text-lg font-semibold leading-tight sm:text-xl md:text-2xl';

  const reportCurrentValues = {
    name: tournament.name,
    abbreviation: tournament.abbreviation,
    forumUrl: forumUrl ?? '',
    rankRangeLowerBound: String(tournament.rankRangeLowerBound),
    lobbySize: String(tournament.lobbySize),
    startTime: tournament.startTime ?? '',
    endTime: tournament.endTime ?? '',
  };

  const cardContent = (
    <div className={cn('flex flex-col', isDetail ? 'gap-4' : 'gap-3')}>
      {isDetail && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
            rejectionReason={tournament.rejectionReason}
            entityType="tournament"
            displayText={true}
            verifierUsername={
              'verifiedByUsername' in tournament &&
              tournament.verifiedByUsername
                ? tournament.verifiedByUsername
                : undefined
            }
          />

          <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-3">
            <span className="text-muted-foreground font-mono text-sm">
              {tournament.abbreviation}
            </span>
            <div className="flex gap-2">
              <ReportButton
                entityType={ReportEntityType.Tournament}
                entityId={tournament.id}
                entityDisplayName={tournament.name}
                reportableFields={TournamentReportableFields}
                currentValues={reportCurrentValues}
              />
              <AdminNoteView
                notes={adminNotes}
                entity={AdminNoteRouteTarget.Tournament}
                entityId={tournament.id}
                entityDisplayName={tournament.name}
              />
              <SimpleTooltip content="View audit history">
                <Button
                  asChild
                  className={cn(
                    'relative',
                    buttonSize,
                    'hover:bg-black/15 hover:text-black dark:hover:bg-white/20 dark:hover:text-white'
                  )}
                  variant="ghost"
                  size="icon"
                >
                  <Link href={`/tournaments/${tournament.id}/audits`}>
                    <History
                      className={cn(
                        iconSize,
                        'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      )}
                    />
                  </Link>
                </Button>
              </SimpleTooltip>
              {canShowAdminControls && (
                <TournamentAdminView tournament={tournament} />
              )}
            </div>
          </div>
        </div>
      )}

      {isDetail ? (
        <div className="flex flex-row items-center gap-2">
          <TitleElement className={titleClasses}>
            {tournament.name}
          </TitleElement>
          {forumUrl && (
            <SimpleTooltip content="View tournament on osu! website">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/15 hover:text-black dark:hover:bg-white/20 dark:hover:text-white"
              >
                <Link
                  href={forumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View tournament on osu! website"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-600 hover:text-black dark:text-white/70 dark:hover:text-white" />
                </Link>
              </Button>
            </SimpleTooltip>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <TitleElement className={titleClasses}>
            {tournament.name}
          </TitleElement>

          <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-2">
            <span className="text-muted-foreground font-mono text-sm">
              {tournament.abbreviation}
            </span>
            {showAdminButtons && (
              <div className="flex gap-2">
                <AdminNoteView
                  notes={adminNotes}
                  entity={AdminNoteRouteTarget.Tournament}
                  entityId={tournament.id}
                  entityDisplayName={tournament.name}
                />
                <SimpleTooltip content="View audit logs">
                  <Button
                    asChild
                    className={cn(
                      'relative',
                      buttonSize,
                      'hover:bg-black/15 hover:text-black dark:hover:bg-white/20 dark:hover:text-white'
                    )}
                    variant="ghost"
                    size="icon"
                  >
                    <Link href={`/tournaments/${tournament.id}/audits`}>
                      <History
                        className={cn(
                          iconSize,
                          'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        )}
                      />
                    </Link>
                  </Button>
                </SimpleTooltip>
                {canShowAdminControls && (
                  <TournamentAdminView tournament={tournament} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-muted-foreground flex flex-col gap-2 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4">
            {!isDetail && (
              <VerificationBadge
                verificationStatus={tournament.verificationStatus}
                rejectionReason={tournament.rejectionReason}
                entityType="tournament"
                displayText={displayStatusText}
                verifierUsername={
                  'verifiedByUsername' in tournament &&
                  tournament.verifiedByUsername
                    ? tournament.verifiedByUsername
                    : undefined
                }
              />
            )}

            <LazerBadge isLazer={tournament.isLazer} />

            <div className="flex items-center gap-1.5">
              <RulesetIcon
                ruleset={tournament.ruleset}
                width={16}
                height={16}
                className="flex-shrink-0 fill-current"
              />
              <span className="truncate">
                {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>
                {tournament.lobbySize}v{tournament.lobbySize}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
              </span>
            </div>

            {'submittedByUsername' in tournament &&
              tournament.submittedByUsername && (
                <SimpleTooltip content="Submitter">
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <UserPlus className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-xs sm:text-sm">
                      {tournament.submittedByUsername}
                    </span>
                  </div>
                </SimpleTooltip>
              )}
          </div>

          {startDate && endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">
                {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
              </span>
            </div>
          )}
        </div>

        {'submittedByUsername' in tournament &&
          tournament.submittedByUsername && (
            <div className="flex flex-row flex-wrap items-center gap-2 sm:hidden">
              <SimpleTooltip content="Submitter">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-xs sm:text-sm">
                    {tournament.submittedByUsername}
                  </span>
                </div>
              </SimpleTooltip>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <Card className="p-4 font-sans sm:p-6">
      {titleIsLink && !isDetail ? (
        <Link href={`/tournaments/${tournament.id}`} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </Card>
  );
}
