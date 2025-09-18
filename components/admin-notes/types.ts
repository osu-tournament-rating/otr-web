import { TournamentAdminNote } from '@/lib/orpc/schema/tournament';

// TODO: remove once matches/games/scores admin notes are implemented
type LegacyAdminNotePlayer = {
  id: number;
  osuId: number;
  username: string;
  country: string;
  defaultRuleset: number;
  osuLastFetch?: string | Date | null;
  osuTrackLastFetch?: string | Date | null;
  userId?: number | null;
};

type LegacyAdminNoteUser = {
  id: number;
  lastLogin?: string | Date | null;
  player: LegacyAdminNotePlayer;
};

export type LegacyAdminNote = {
  id: number;
  referenceId: number;
  note: string;
  created: string | Date;
  updated?: string | Date | null;
  adminUser: LegacyAdminNoteUser;
};

export type AdminNote = TournamentAdminNote | LegacyAdminNote;
