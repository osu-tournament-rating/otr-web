import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  TournamentAdminMutationResponseSchema,
  TournamentAdminNoteCreateInputSchema,
  TournamentAdminNoteDeleteInputSchema,
  TournamentAdminNoteSchema,
  TournamentAdminNoteUpdateInputSchema,
} from '@/lib/orpc/schema/tournament';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';
import { fetchTournamentAdminNoteById } from './utils/adminNotes';

const NOW = sql`CURRENT_TIMESTAMP`;

export const createTournamentAdminNote = protectedProcedure
  .input(TournamentAdminNoteCreateInputSchema)
  .output(TournamentAdminNoteSchema)
  .route({
    summary: 'Admin: create tournament admin note',
    tags: ['admin'],
    path: '/tournaments/admin-notes/create',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const tournament = await context.db.query.tournaments.findFirst({
      columns: { id: true },
      where: eq(schema.tournaments.id, input.tournamentId),
    });

    if (!tournament) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Tournament not found',
      });
    }

    const [created] = await context.db
      .insert(schema.tournamentAdminNotes)
      .values({
        referenceId: input.tournamentId,
        adminUserId,
        note: input.note,
      })
      .returning({ id: schema.tournamentAdminNotes.id });

    const note = await fetchTournamentAdminNoteById(context.db, created.id);

    if (!note) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load created admin note',
      });
    }

    return note;
  });

export const updateTournamentAdminNote = protectedProcedure
  .input(TournamentAdminNoteUpdateInputSchema)
  .output(TournamentAdminNoteSchema)
  .route({
    summary: 'Admin: update tournament admin note',
    tags: ['admin'],
    path: '/tournaments/admin-notes/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const existing = await context.db
      .select({
        id: schema.tournamentAdminNotes.id,
        adminUserId: schema.tournamentAdminNotes.adminUserId,
      })
      .from(schema.tournamentAdminNotes)
      .where(eq(schema.tournamentAdminNotes.id, input.noteId))
      .limit(1);

    const [note] = existing;

    if (!note) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Admin note not found',
      });
    }

    if (note.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You can only update your own admin notes',
      });
    }

    await context.db
      .update(schema.tournamentAdminNotes)
      .set({
        note: input.note,
        updated: NOW,
      })
      .where(eq(schema.tournamentAdminNotes.id, input.noteId));

    const updated = await fetchTournamentAdminNoteById(
      context.db,
      input.noteId
    );

    if (!updated) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load updated admin note',
      });
    }

    return updated;
  });

export const deleteTournamentAdminNote = protectedProcedure
  .input(TournamentAdminNoteDeleteInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete tournament admin note',
    tags: ['admin'],
    path: '/tournaments/admin-notes/delete',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const existing = await context.db
      .select({
        id: schema.tournamentAdminNotes.id,
        adminUserId: schema.tournamentAdminNotes.adminUserId,
      })
      .from(schema.tournamentAdminNotes)
      .where(eq(schema.tournamentAdminNotes.id, input.noteId))
      .limit(1);

    const [note] = existing;

    if (!note) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Admin note not found',
      });
    }

    if (note.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You can only delete your own admin notes',
      });
    }

    await context.db
      .delete(schema.tournamentAdminNotes)
      .where(eq(schema.tournamentAdminNotes.id, input.noteId));

    return { success: true } as const;
  });
