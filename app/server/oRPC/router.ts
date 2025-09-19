import { os } from '@orpc/server';

import { getLeaderboard } from './procedures/leaderboardProcedures';
import { getMatch } from './procedures/matchesProcedures';
import {
  getPlayer,
  getPlayerDashboardStats,
} from './procedures/playerProcedures';
import { searchEntities } from './procedures/searchProcedures';
import { getCurrentUser, getUser } from './procedures/userProcedures';
import {
  getTournament,
  listTournaments,
} from './procedures/tournamentsProcedures';
import { submitTournament } from './procedures/tournaments/tournamentSubmissionProcedure';
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
import { getPlatformStats } from './procedures/statsProcedures';
import {
  filterRegistrants,
  getFilterReport,
} from './procedures/filteringProcedures';

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
  players: {
    get: getPlayer,
    dashboard: getPlayerDashboardStats,
  },
  stats: {
    platform: getPlatformStats,
  },
  filtering: {
    filter: filterRegistrants,
    report: getFilterReport,
  },
  tournaments: {
    list: listTournaments,
    get: getTournament,
    submit: submitTournament,
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
