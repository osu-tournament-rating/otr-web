import { os } from '@orpc/server';

import { getCurrentUser, getLeaderboard, getUser } from './procedures';

export interface InitialContext {
  headers: Headers;
}

// Create base with initial context
const base = os.$context<InitialContext>();

export const router = base.router({
  // Player endpoints
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
