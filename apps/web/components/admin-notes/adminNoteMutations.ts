import { orpc } from '@/lib/orpc/orpc';
import { AdminNoteRouteTarget } from '@otr/core/osu';
import type { TournamentAdminMutationResponse } from '@/lib/orpc/schema/tournament';

import type { AdminNote } from './types';

type AdminNoteMutationHandlers = {
  create: (entityId: number, note: string) => Promise<AdminNote>;
  update: (noteId: number, note: string) => Promise<AdminNote>;
  delete: (noteId: number) => Promise<TournamentAdminMutationResponse>;
};

const adminNoteMutations: Partial<
  Record<AdminNoteRouteTarget, AdminNoteMutationHandlers>
> = {
  [AdminNoteRouteTarget.Tournament]: {
    create: (entityId, note) =>
      orpc.tournaments.adminNotes.create({ tournamentId: entityId, note }),
    update: (noteId, note) =>
      orpc.tournaments.adminNotes.update({ noteId, note }),
    delete: (noteId) => orpc.tournaments.adminNotes.delete({ noteId }),
  },
  [AdminNoteRouteTarget.Match]: {
    create: (entityId, note) =>
      orpc.matches.adminNotes.create({ matchId: entityId, note }),
    update: (noteId, note) => orpc.matches.adminNotes.update({ noteId, note }),
    delete: (noteId) => orpc.matches.adminNotes.delete({ noteId }),
  },
  [AdminNoteRouteTarget.Game]: {
    create: (entityId, note) =>
      orpc.games.adminNotes.create({ gameId: entityId, note }),
    update: (noteId, note) => orpc.games.adminNotes.update({ noteId, note }),
    delete: (noteId) => orpc.games.adminNotes.delete({ noteId }),
  },
  [AdminNoteRouteTarget.GameScore]: {
    create: (entityId, note) =>
      orpc.scores.adminNotes.create({ scoreId: entityId, note }),
    update: (noteId, note) => orpc.scores.adminNotes.update({ noteId, note }),
    delete: (noteId) => orpc.scores.adminNotes.delete({ noteId }),
  },
};

export function getAdminNoteMutations(
  entity: AdminNoteRouteTarget
): AdminNoteMutationHandlers | null {
  return adminNoteMutations[entity] ?? null;
}
