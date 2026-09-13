import { MessagePriority } from '../messages/values';

type QueueMap = {
  automatedChecks: {
    tournaments: 'processing.checks.tournaments';
  };
  osu: 'data.osu';
  osuTrack: 'data.osutrack';
  stats: {
    tournaments: 'processing.stats.tournaments';
  };
};

export const QueueConstants: QueueMap = {
  automatedChecks: {
    tournaments: 'processing.checks.tournaments',
  },
  osu: 'data.osu',
  osuTrack: 'data.osutrack',
  stats: {
    tournaments: 'processing.stats.tournaments',
  },
};

export type QueueGroup = keyof QueueMap;
export type QueueName =
  | QueueMap['automatedChecks']['tournaments']
  | QueueMap['osu']
  | QueueMap['osuTrack']
  | QueueMap['stats']['tournaments'];

export const QueuePriorityArguments = {
  'x-max-priority': MessagePriority.High,
} as const;
