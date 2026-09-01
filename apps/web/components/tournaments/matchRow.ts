import { VerificationStatus } from '@otr/core/osu';
import type { MatchRejectionReason, MatchWarningFlags } from '@otr/core/osu';
import type {
  TournamentMatch,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';

export type AdminNotePreview = {
  note: string;
  adminUsername: string;
  created: string;
};

export type GameWithNotes = Pick<
  TournamentMatchGame,
  'verificationStatus' | 'warningFlags' | 'startTime' | 'rejectionReason'
> & {
  id: number;
  adminNotes: AdminNotePreview[];
};

export type MatchRow = {
  id: number;
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
    rejectionReason: MatchRejectionReason;
    verifiedByUsername: string | null;
  };
  startDate: string | null;
  winRecord: TournamentMatch['winRecord'];
  games: GameWithNotes[];
  matchAdminNotes: AdminNotePreview[];
};

export const getVerificationStatusPriority = (
  status: VerificationStatus
): number => {
  switch (status) {
    case VerificationStatus.Verified:
      return 4;
    case VerificationStatus.PreVerified:
      return 3;
    case VerificationStatus.None:
      return 2;
    case VerificationStatus.PreRejected:
      return 1;
    case VerificationStatus.Rejected:
      return 0;
    default:
      return -1;
  }
};
