import { createSelectSchema } from 'drizzle-zod';

import * as schema from '@otr/core/db/schema';

export const playerSelectSchema = createSelectSchema(schema.players);

export const userSelectSchema = createSelectSchema(schema.users);

export const beatmapsetSelectSchema = createSelectSchema(schema.beatmapsets);
export const beatmapSelectSchema = createSelectSchema(schema.beatmaps);
export const beatmapAttributeSelectSchema = createSelectSchema(
  schema.beatmapAttributes
);

export const gameSelectSchema = createSelectSchema(schema.games);
export const gameScoreSelectSchema = createSelectSchema(schema.gameScores);
export const matchSelectSchema = createSelectSchema(schema.matches);
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

export const tournamentSelectSchema = createSelectSchema(schema.tournaments);
export const tournamentAdminNoteSelectSchema = createSelectSchema(
  schema.tournamentAdminNotes
);
export const playerRatingSelectSchema = createSelectSchema(
  schema.playerRatings
);
