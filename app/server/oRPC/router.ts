import { os } from '@orpc/server';

import { getLeaderboard } from './procedures/leaderboardProcedures';
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
  tournaments: {
    list: listTournaments,
    get: getTournament,
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
