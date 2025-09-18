import { os } from '@orpc/server';

import { getLeaderboard } from './procedures/leaderboardProcedures';
import { getMatch } from './procedures/matchesProcedures';
import { searchEntities } from './procedures/searchProcedures';
import { getCurrentUser, getUser } from './procedures/userProcedures';
import {
  getTournament,
  listTournaments,
} from './procedures/tournamentsProcedures';
import {
  acceptTournamentPreVerificationStatuses,
  deleteTournamentAdmin,
  deleteTournamentBeatmapsAdmin,
  refetchTournamentMatchData,
  resetTournamentAutomatedChecks,
  updateTournamentAdmin,
} from './procedures/tournaments/adminProcedures';
import {
  createTournamentAdminNote,
  deleteTournamentAdminNote,
  updateTournamentAdminNote,
} from './procedures/tournaments/adminNotesProcedures';

export interface InitialContext {
  headers: Headers;
}

const base = os.$context<InitialContext>();

export const router = base.router({
  user: {
    get: getUser,
  },
  users: {
    me: getCurrentUser,
  },
  leaderboard: {
    list: getLeaderboard,
  },
  search: {
    query: searchEntities,
  },
  matches: {
    get: getMatch,
  },
  tournaments: {
    list: listTournaments,
    get: getTournament,
    adminNotes: {
      create: createTournamentAdminNote,
      update: updateTournamentAdminNote,
      delete: deleteTournamentAdminNote,
    },
    admin: {
      update: updateTournamentAdmin,
      resetAutomatedChecks: resetTournamentAutomatedChecks,
      acceptPreVerificationStatuses: acceptTournamentPreVerificationStatuses,
      delete: deleteTournamentAdmin,
      deleteBeatmaps: deleteTournamentBeatmapsAdmin,
      refetchMatchData: refetchTournamentMatchData,
    },
  },
});

export type Router = typeof router;
