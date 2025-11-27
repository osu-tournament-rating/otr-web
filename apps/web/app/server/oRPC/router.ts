import { os } from '@orpc/server';

import {
  getLeaderboard,
  getLeaderboardFriends,
} from './procedures/leaderboardProcedures';
import { getMatch } from './procedures/matchesProcedures';
import {
  deleteGameAdmin,
  lookupGamesAdmin,
  mergeGameAdmin,
  updateGameAdmin,
} from './procedures/games/adminProcedures';
import {
  deleteMatchAdmin,
  deleteMatchPlayerScoresAdmin,
  mergeMatchAdmin,
  updateMatchAdmin,
} from './procedures/matches/adminProcedures';
import {
  deleteScoreAdmin,
  updateScoreAdmin,
} from './procedures/scores/adminProcedures';
import {
  getPlayer,
  getPlayerBeatmaps,
  getPlayerStats,
  getPlayerTournaments,
} from './procedures/playerProcedures';
import { searchEntities } from './procedures/searchProcedures';
import {
  deleteMyAccount,
  deleteMyFriends,
  getCurrentUser,
  getUser,
} from './procedures/userProcedures';
import {
  banUserAdmin,
  listUserApiKeysAdmin,
  lookupAuthUserAdmin,
  searchPlayersAdmin,
} from './procedures/users/adminProcedures';
import {
  getTournament,
  listTournaments,
} from './procedures/tournamentsProcedures';
import { submitTournament } from './procedures/tournaments/tournamentSubmissionProcedure';
import {
  acceptTournamentPreVerificationStatuses,
  deleteTournamentAdmin,
  deleteTournamentBeatmapsAdmin,
  refetchTournamentBeatmaps,
  refetchTournamentMatchData,
  resetTournamentAutomatedChecks,
  updateTournamentAdmin,
} from './procedures/tournaments/adminProcedures';
import { manageTournamentBeatmapsAdmin } from './procedures/tournaments/beatmapAdminProcedures';
import {
  createGameAdminNote,
  createMatchAdminNote,
  createScoreAdminNote,
  createTournamentAdminNote,
  deleteGameAdminNote,
  deleteMatchAdminNote,
  deleteScoreAdminNote,
  deleteTournamentAdminNote,
  updateGameAdminNote,
  updateMatchAdminNote,
  updateScoreAdminNote,
  updateTournamentAdminNote,
} from './procedures/adminNotesProcedures';
import { getPlatformStats } from './procedures/statsProcedures';
import {
  filterRegistrants,
  getFilterReport,
} from './procedures/filteringProcedures';
import {
  deleteUserApiKey,
  generateUserApiKey,
  getUserApiKeys,
} from './procedures/apiKeyProcedures';
import { massEnqueue } from './procedures/admin/massEnqueueProcedures';
import {
  createReport,
  getReport,
  listReports,
  resolveReport,
} from './procedures/reports/reportProcedures';

export interface InitialContext {
  headers: Headers;
}

const base = os.$context<InitialContext>();

export const router = base.router({
  admin: {
    massEnqueue,
  },
  reports: {
    create: createReport,
    list: listReports,
    get: getReport,
    resolve: resolveReport,
  },
  user: {
    get: getUser,
  },
  users: {
    me: getCurrentUser,
    deleteMe: deleteMyAccount,
    deleteMyFriends: deleteMyFriends,
    admin: {
      search: searchPlayersAdmin,
      lookup: lookupAuthUserAdmin,
      ban: banUserAdmin,
      apiKeys: listUserApiKeysAdmin,
    },
  },
  leaderboard: {
    list: getLeaderboard,
    friends: getLeaderboardFriends,
  },
  search: {
    query: searchEntities,
  },
  matches: {
    get: getMatch,
    admin: {
      update: updateMatchAdmin,
      delete: deleteMatchAdmin,
      deletePlayerScores: deleteMatchPlayerScoresAdmin,
      merge: mergeMatchAdmin,
    },
    adminNotes: {
      create: createMatchAdminNote,
      update: updateMatchAdminNote,
      delete: deleteMatchAdminNote,
    },
  },
  games: {
    admin: {
      update: updateGameAdmin,
      delete: deleteGameAdmin,
      merge: mergeGameAdmin,
      lookup: lookupGamesAdmin,
    },
    adminNotes: {
      create: createGameAdminNote,
      update: updateGameAdminNote,
      delete: deleteGameAdminNote,
    },
  },
  scores: {
    admin: {
      update: updateScoreAdmin,
      delete: deleteScoreAdmin,
    },
    adminNotes: {
      create: createScoreAdminNote,
      update: updateScoreAdminNote,
      delete: deleteScoreAdminNote,
    },
  },
  players: {
    get: getPlayer,
    beatmaps: getPlayerBeatmaps,
    stats: getPlayerStats,
    tournaments: getPlayerTournaments,
  },
  stats: {
    platform: getPlatformStats,
  },
  filtering: {
    filter: filterRegistrants,
    report: getFilterReport,
  },
  apiClients: {
    getKeys: getUserApiKeys,
    generateKey: generateUserApiKey,
    deleteKey: deleteUserApiKey,
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
      manageBeatmaps: manageTournamentBeatmapsAdmin,
      deleteBeatmaps: deleteTournamentBeatmapsAdmin,
      refetchMatchData: refetchTournamentMatchData,
      refetchBeatmaps: refetchTournamentBeatmaps,
    },
  },
});

export type Router = typeof router;
