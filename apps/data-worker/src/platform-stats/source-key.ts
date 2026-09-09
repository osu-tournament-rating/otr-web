/** Stand-in for an input table that is still empty, so the key keeps a fixed shape. */
const MISSING = 'none';

const SEPARATOR = '|';

// A type alias, not an interface: it is used as a `tx.execute` row type.
export type PlayerStatsSourceTimestamps = {
  ratingsCreated: Date | string | null;
  tournamentStatsCreated: Date | string | null;
  tournamentsUpdated: Date | string | null;
  matchesUpdated: Date | string | null;
};

const iso = (value: Date | string | null): string =>
  value === null ? MISSING : new Date(value).toISOString();

/**
 * Watermark of everything a snapshot is derived from. The UTC date is part of the key because the
 * recent, active, and upset windows move with the calendar even when no source row changes.
 */
export const formatPlayerStatsSourceKey = (
  timestamps: PlayerStatsSourceTimestamps,
  now: Date
): string =>
  [
    iso(timestamps.ratingsCreated),
    iso(timestamps.tournamentStatsCreated),
    iso(timestamps.tournamentsUpdated),
    iso(timestamps.matchesUpdated),
    now.toISOString().slice(0, 10),
  ].join(SEPARATOR);
