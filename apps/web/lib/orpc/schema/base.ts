import { createSelectSchema } from 'drizzle-zod';

import * as schema from '@otr/core/db/schema';

const rawPlayerSelectSchema = createSelectSchema(schema.players);
export const playerSelectSchema = rawPlayerSelectSchema.omit({
  searchVector: true,
});

export const userSelectSchema = createSelectSchema(schema.users);

export const beatmapsetSelectSchema = createSelectSchema(schema.beatmapsets);

const rawBeatmapSelectSchema = createSelectSchema(schema.beatmaps);
export const beatmapSelectSchema = rawBeatmapSelectSchema.omit({
  searchVector: true,
});
export const beatmapAttributeSelectSchema = createSelectSchema(
  schema.beatmapAttributes
);

export const gameSelectSchema = createSelectSchema(schema.games);
export const gameScoreSelectSchema = createSelectSchema(schema.gameScores);

const rawMatchSelectSchema = createSelectSchema(schema.matches);
export const matchSelectSchema = rawMatchSelectSchema.omit({
  searchVector: true,
});

export const matchRosterSelectSchema = createSelectSchema(schema.matchRosters);

export const playerMatchStatsSelectSchema = createSelectSchema(
  schema.playerMatchStats
);
export const playerTournamentStatsSelectSchema = createSelectSchema(
  schema.playerTournamentStats
);
export const ratingAdjustmentSelectSchema = createSelectSchema(
  schema.ratingAdjustments
);
export const filterReportSelectSchema = createSelectSchema(
  schema.filterReports
);
export const filterReportPlayerSelectSchema = createSelectSchema(
  schema.filterReportPlayers
);

const rawTournamentSelectSchema = createSelectSchema(schema.tournaments);
export const tournamentSelectSchema = rawTournamentSelectSchema.omit({
  searchVector: true,
});

export const tournamentAdminNoteSelectSchema = createSelectSchema(
  schema.tournamentAdminNotes
);
export const playerRatingSelectSchema = createSelectSchema(
  schema.playerRatings
);

export const dataReportSelectSchema = createSelectSchema(schema.dataReports);
