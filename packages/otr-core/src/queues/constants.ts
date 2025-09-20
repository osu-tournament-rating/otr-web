type QueueMap = {
  automatedChecks: {
    tournaments: 'processing.checks.tournaments';
  };
  osu: {
    beatmaps: 'data.osu.beatmaps';
    matches: 'data.osu.matches';
    players: 'data.osu.players';
  };
  osuTrack: {
    players: 'data.osutrack.players';
  };
  stats: {
    tournaments: 'processing.stats.tournaments';
  };
};

export const QueueConstants: QueueMap = {
  automatedChecks: {
    tournaments: 'processing.checks.tournaments',
  },
  osu: {
    beatmaps: 'data.osu.beatmaps',
    matches: 'data.osu.matches',
    players: 'data.osu.players',
  },
  osuTrack: {
    players: 'data.osutrack.players',
  },
  stats: {
    tournaments: 'processing.stats.tournaments',
  },
};

export type QueueGroup = keyof QueueMap;
export type QueueName = QueueMap[QueueGroup][keyof QueueMap[QueueGroup]];
