import { os } from '@orpc/server';

import { getLeaderboard } from './procedures/leaderboardProcedures';
import { getCurrentUser, getUser } from './procedures/userProcedures';

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
});

export type Router = typeof router;
