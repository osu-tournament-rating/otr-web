import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@/lib/db/schema';
import type { TournamentAdminNote } from '@/lib/orpc/schema/tournament';

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

const selectAdminNoteFields = {
  id: schema.tournamentAdminNotes.id,
  referenceId: schema.tournamentAdminNotes.referenceId,
  note: schema.tournamentAdminNotes.note,
  created: schema.tournamentAdminNotes.created,
  updated: schema.tournamentAdminNotes.updated,
  userId: schema.users.id,
  userLastLogin: schema.users.lastLogin,
  playerId: schema.players.id,
  playerOsuId: schema.players.osuId,
  playerUsername: schema.players.username,
  playerCountry: schema.players.country,
  playerDefaultRuleset: schema.players.defaultRuleset,
  playerOsuLastFetch: schema.players.osuLastFetch,
  playerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
};

type TournamentAdminNoteRow = {
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

type DrizzleDatabase = NodePgDatabase<typeof schema>;

const mapTournamentAdminNoteRow = (
  note: TournamentAdminNoteRow
): TournamentAdminNote => {
  const base: Pick<
    TournamentAdminNote,
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
    } satisfies TournamentAdminNote;
  }

  return {
    ...base,
    adminUser: {
      ...FALLBACK_ADMIN_USER,
      player: { ...FALLBACK_PLAYER },
    },
  } satisfies TournamentAdminNote;
};

export async function fetchTournamentAdminNotes(
  db: DrizzleDatabase,
  tournamentId: number
): Promise<TournamentAdminNote[]> {
  const rows = await db
    .select(selectAdminNoteFields)
    .from(schema.tournamentAdminNotes)
    .leftJoin(
      schema.users,
      eq(schema.users.id, schema.tournamentAdminNotes.adminUserId)
    )
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(eq(schema.tournamentAdminNotes.referenceId, tournamentId))
    .orderBy(desc(schema.tournamentAdminNotes.created));

  return (rows as TournamentAdminNoteRow[]).map((note) =>
    mapTournamentAdminNoteRow(note)
  );
}

export async function fetchTournamentAdminNoteById(
  db: DrizzleDatabase,
  noteId: number
): Promise<TournamentAdminNote | null> {
  const rows = await db
    .select(selectAdminNoteFields)
    .from(schema.tournamentAdminNotes)
    .leftJoin(
      schema.users,
      eq(schema.users.id, schema.tournamentAdminNotes.adminUserId)
    )
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(eq(schema.tournamentAdminNotes.id, noteId))
    .limit(1);

  const [note] = rows as TournamentAdminNoteRow[];

  if (!note) {
    return null;
  }

  return mapTournamentAdminNoteRow(note);
}
