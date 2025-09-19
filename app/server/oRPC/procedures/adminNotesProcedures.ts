import { ORPCError } from '@orpc/server';
import { desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@/lib/db/schema';
import { AdminNoteSchema } from '@/lib/orpc/schema/common';
import {
  TournamentAdminMutationResponseSchema,
  TournamentAdminNoteCreateInputSchema,
  TournamentAdminNoteDeleteInputSchema,
  TournamentAdminNoteUpdateInputSchema,
} from '@/lib/orpc/schema/tournament';
import {
  GameAdminNoteCreateInputSchema,
  GameAdminNoteDeleteInputSchema,
  GameAdminNoteUpdateInputSchema,
  GameScoreAdminNoteCreateInputSchema,
  GameScoreAdminNoteDeleteInputSchema,
  GameScoreAdminNoteUpdateInputSchema,
  MatchAdminNoteCreateInputSchema,
  MatchAdminNoteDeleteInputSchema,
  MatchAdminNoteUpdateInputSchema,
} from '@/lib/orpc/schema/match';

import { protectedProcedure } from './base';
import { ensureAdminSession } from './shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

const ADMIN_NOTE_NOT_FOUND = 'Admin note not found';
const ADMIN_NOTE_FORBIDDEN = 'You can only modify your own admin notes';

const FALLBACK_PLAYER = {
  id: -1,
  osuId: -1,
  username: 'Unknown',
  country: '',
  defaultRuleset: 0,
  osuLastFetch: '2007-09-17 00:00:00',
  osuTrackLastFetch: '2007-09-17 00:00:00',
  userId: null as number | null,
};

const FALLBACK_ADMIN_USER = {
  id: -1,
  lastLogin: null as string | null,
  player: FALLBACK_PLAYER,
};

type DrizzleDatabase = NodePgDatabase<typeof schema>;

type AdminNote = ReturnType<(typeof AdminNoteSchema)['parse']>;

type AdminNoteTable =
  | typeof schema.tournamentAdminNotes
  | typeof schema.matchAdminNotes
  | typeof schema.gameAdminNotes
  | typeof schema.gameScoreAdminNotes;

type AdminNoteRow = {
  id: number;
  referenceId: number;
  note: string;
  created: string;
  updated: string | null;
  userId: number | null;
  userLastLogin: string | null;
  playerId: number | null;
  playerOsuId: number | null;
  playerUsername: string | null;
  playerCountry: string | null;
  playerDefaultRuleset: number | null;
  playerOsuLastFetch: string | null;
  playerOsuTrackLastFetch: string | null;
};

const selectAdminNoteFields = (table: AdminNoteTable) => ({
  id: table.id,
  referenceId: table.referenceId,
  note: table.note,
  created: table.created,
  updated: table.updated,
  userId: schema.users.id,
  userLastLogin: schema.users.lastLogin,
  playerId: schema.players.id,
  playerOsuId: schema.players.osuId,
  playerUsername: schema.players.username,
  playerCountry: schema.players.country,
  playerDefaultRuleset: schema.players.defaultRuleset,
  playerOsuLastFetch: schema.players.osuLastFetch,
  playerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
});

const mapAdminNoteRow = (note: AdminNoteRow): AdminNote => {
  const base: Pick<
    AdminNote,
    'id' | 'referenceId' | 'note' | 'created' | 'updated'
  > = {
    id: note.id,
    referenceId: note.referenceId,
    note: note.note,
    created: note.created,
    updated: note.updated ?? null,
  };

  if (note.userId != null && note.playerId != null) {
    return {
      ...base,
      adminUser: {
        id: note.userId,
        lastLogin: note.userLastLogin ?? null,
        player: {
          id: note.playerId,
          osuId: note.playerOsuId ?? -1,
          username: note.playerUsername ?? 'Unknown',
          country: note.playerCountry ?? '',
          defaultRuleset: note.playerDefaultRuleset ?? 0,
          osuLastFetch: note.playerOsuLastFetch ?? '2007-09-17 00:00:00',
          osuTrackLastFetch:
            note.playerOsuTrackLastFetch ?? '2007-09-17 00:00:00',
          userId: note.userId,
        },
      },
    } satisfies AdminNote;
  }

  return {
    ...base,
    adminUser: {
      ...FALLBACK_ADMIN_USER,
      player: { ...FALLBACK_PLAYER },
    },
  } satisfies AdminNote;
};

export async function fetchAdminNotes(
  db: DrizzleDatabase,
  table: AdminNoteTable,
  referenceId: number
): Promise<AdminNote[]> {
  const rows = await db
    .select(selectAdminNoteFields(table))
    .from(table)
    .leftJoin(schema.users, eq(schema.users.id, table.adminUserId))
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(eq(table.referenceId, referenceId))
    .orderBy(desc(table.created));

  return (rows as AdminNoteRow[]).map((note) => mapAdminNoteRow(note));
}

export async function fetchAdminNoteById(
  db: DrizzleDatabase,
  table: AdminNoteTable,
  noteId: number
): Promise<AdminNote | null> {
  const rows = await db
    .select(selectAdminNoteFields(table))
    .from(table)
    .leftJoin(schema.users, eq(schema.users.id, table.adminUserId))
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(eq(table.id, noteId))
    .limit(1);

  const [note] = rows as AdminNoteRow[];

  if (!note) {
    return null;
  }

  return mapAdminNoteRow(note);
}

export async function fetchTournamentAdminNotes(
  db: DrizzleDatabase,
  tournamentId: number
): Promise<AdminNote[]> {
  return fetchAdminNotes(db, schema.tournamentAdminNotes, tournamentId);
}

async function assertTournamentExists(
  db: DrizzleDatabase,
  tournamentId: number
) {
  const tournament = await db.query.tournaments.findFirst({
    columns: { id: true },
    where: eq(schema.tournaments.id, tournamentId),
  });

  if (!tournament) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Tournament not found',
    });
  }
}

async function assertMatchExists(db: DrizzleDatabase, matchId: number) {
  const match = await db.query.matches.findFirst({
    columns: { id: true },
    where: eq(schema.matches.id, matchId),
  });

  if (!match) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Match not found',
    });
  }
}

async function assertGameExists(db: DrizzleDatabase, gameId: number) {
  const game = await db.query.games.findFirst({
    columns: { id: true },
    where: eq(schema.games.id, gameId),
  });

  if (!game) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Game not found',
    });
  }
}

async function assertGameScoreExists(db: DrizzleDatabase, scoreId: number) {
  const score = await db.query.gameScores.findFirst({
    columns: { id: true },
    where: eq(schema.gameScores.id, scoreId),
  });

  if (!score) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Score not found',
    });
  }
}

type AdminNoteRecord = {
  id: number;
  adminUserId: number;
};

async function getAdminNoteRecord(
  db: DrizzleDatabase,
  table: AdminNoteTable,
  noteId: number
): Promise<AdminNoteRecord | null> {
  const rows = await db
    .select({
      id: table.id,
      adminUserId: table.adminUserId,
    })
    .from(table)
    .where(eq(table.id, noteId))
    .limit(1);

  const [note] = rows as AdminNoteRecord[];

  return note ?? null;
}

export const createTournamentAdminNote = protectedProcedure
  .input(TournamentAdminNoteCreateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: create tournament admin note',
    tags: ['admin'],
    path: '/tournaments/admin-notes/create',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await assertTournamentExists(context.db, input.tournamentId);

    const [created] = await context.db
      .insert(schema.tournamentAdminNotes)
      .values({
        referenceId: input.tournamentId,
        adminUserId,
        note: input.note,
      })
      .returning({ id: schema.tournamentAdminNotes.id });

    const note = await fetchAdminNoteById(
      context.db,
      schema.tournamentAdminNotes,
      created.id
    );

    if (!note) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load created admin note',
      });
    }

    return note;
  });

export const updateTournamentAdminNote = protectedProcedure
  .input(TournamentAdminNoteUpdateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: update tournament admin note',
    tags: ['admin'],
    path: '/tournaments/admin-notes/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.tournamentAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .update(schema.tournamentAdminNotes)
      .set({
        note: input.note,
        updated: NOW,
      })
      .where(eq(schema.tournamentAdminNotes.id, input.noteId));

    const updated = await fetchAdminNoteById(
      context.db,
      schema.tournamentAdminNotes,
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

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.tournamentAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .delete(schema.tournamentAdminNotes)
      .where(eq(schema.tournamentAdminNotes.id, input.noteId));

    return { success: true } as const;
  });

export const createMatchAdminNote = protectedProcedure
  .input(MatchAdminNoteCreateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: create match admin note',
    tags: ['admin'],
    path: '/matches/admin-notes/create',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await assertMatchExists(context.db, input.matchId);

    const [created] = await context.db
      .insert(schema.matchAdminNotes)
      .values({
        referenceId: input.matchId,
        adminUserId,
        note: input.note,
      })
      .returning({ id: schema.matchAdminNotes.id });

    const note = await fetchAdminNoteById(
      context.db,
      schema.matchAdminNotes,
      created.id
    );

    if (!note) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load created admin note',
      });
    }

    return note;
  });

export const updateMatchAdminNote = protectedProcedure
  .input(MatchAdminNoteUpdateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: update match admin note',
    tags: ['admin'],
    path: '/matches/admin-notes/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.matchAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .update(schema.matchAdminNotes)
      .set({
        note: input.note,
        updated: NOW,
      })
      .where(eq(schema.matchAdminNotes.id, input.noteId));

    const updated = await fetchAdminNoteById(
      context.db,
      schema.matchAdminNotes,
      input.noteId
    );

    if (!updated) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load updated admin note',
      });
    }

    return updated;
  });

export const deleteMatchAdminNote = protectedProcedure
  .input(MatchAdminNoteDeleteInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete match admin note',
    tags: ['admin'],
    path: '/matches/admin-notes/delete',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.matchAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .delete(schema.matchAdminNotes)
      .where(eq(schema.matchAdminNotes.id, input.noteId));

    return { success: true } as const;
  });

export const createGameAdminNote = protectedProcedure
  .input(GameAdminNoteCreateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: create game admin note',
    tags: ['admin'],
    path: '/games/admin-notes/create',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await assertGameExists(context.db, input.gameId);

    const [created] = await context.db
      .insert(schema.gameAdminNotes)
      .values({
        referenceId: input.gameId,
        adminUserId,
        note: input.note,
      })
      .returning({ id: schema.gameAdminNotes.id });

    const note = await fetchAdminNoteById(
      context.db,
      schema.gameAdminNotes,
      created.id
    );

    if (!note) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load created admin note',
      });
    }

    return note;
  });

export const updateGameAdminNote = protectedProcedure
  .input(GameAdminNoteUpdateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: update game admin note',
    tags: ['admin'],
    path: '/games/admin-notes/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.gameAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .update(schema.gameAdminNotes)
      .set({
        note: input.note,
        updated: NOW,
      })
      .where(eq(schema.gameAdminNotes.id, input.noteId));

    const updated = await fetchAdminNoteById(
      context.db,
      schema.gameAdminNotes,
      input.noteId
    );

    if (!updated) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load updated admin note',
      });
    }

    return updated;
  });

export const deleteGameAdminNote = protectedProcedure
  .input(GameAdminNoteDeleteInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete game admin note',
    tags: ['admin'],
    path: '/games/admin-notes/delete',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.gameAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .delete(schema.gameAdminNotes)
      .where(eq(schema.gameAdminNotes.id, input.noteId));

    return { success: true } as const;
  });

export const createScoreAdminNote = protectedProcedure
  .input(GameScoreAdminNoteCreateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: create score admin note',
    tags: ['admin'],
    path: '/scores/admin-notes/create',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    await assertGameScoreExists(context.db, input.scoreId);

    const [created] = await context.db
      .insert(schema.gameScoreAdminNotes)
      .values({
        referenceId: input.scoreId,
        adminUserId,
        note: input.note,
      })
      .returning({ id: schema.gameScoreAdminNotes.id });

    const note = await fetchAdminNoteById(
      context.db,
      schema.gameScoreAdminNotes,
      created.id
    );

    if (!note) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load created admin note',
      });
    }

    return note;
  });

export const updateScoreAdminNote = protectedProcedure
  .input(GameScoreAdminNoteUpdateInputSchema)
  .output(AdminNoteSchema)
  .route({
    summary: 'Admin: update score admin note',
    tags: ['admin'],
    path: '/scores/admin-notes/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.gameScoreAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .update(schema.gameScoreAdminNotes)
      .set({
        note: input.note,
        updated: NOW,
      })
      .where(eq(schema.gameScoreAdminNotes.id, input.noteId));

    const updated = await fetchAdminNoteById(
      context.db,
      schema.gameScoreAdminNotes,
      input.noteId
    );

    if (!updated) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Unable to load updated admin note',
      });
    }

    return updated;
  });

export const deleteScoreAdminNote = protectedProcedure
  .input(GameScoreAdminNoteDeleteInputSchema)
  .output(TournamentAdminMutationResponseSchema)
  .route({
    summary: 'Admin: delete score admin note',
    tags: ['admin'],
    path: '/scores/admin-notes/delete',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const noteRecord = await getAdminNoteRecord(
      context.db,
      schema.gameScoreAdminNotes,
      input.noteId
    );

    if (!noteRecord) {
      throw new ORPCError('NOT_FOUND', {
        message: ADMIN_NOTE_NOT_FOUND,
      });
    }

    if (noteRecord.adminUserId !== adminUserId) {
      throw new ORPCError('FORBIDDEN', {
        message: ADMIN_NOTE_FORBIDDEN,
      });
    }

    await context.db
      .delete(schema.gameScoreAdminNotes)
      .where(eq(schema.gameScoreAdminNotes.id, input.noteId));

    return { success: true } as const;
  });
