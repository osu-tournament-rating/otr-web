import { os } from '@orpc/server';
import * as procedures from './procedures';

export interface InitialContext {
  headers: Headers;
}

// Create base with initial context
const base = os.$context<InitialContext>();

export const router = base.router({
  // Player endpoints
  player: {
    get: procedures.getPlayer,
  },
});

export type Router = typeof router;
