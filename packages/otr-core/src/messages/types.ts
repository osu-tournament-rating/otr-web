import type { MessageMetadata } from './values';

/**
 * Default envelope shape combining metadata with message-specific payload.
 */
export type MessageEnvelope<TPayload> = MessageMetadata & TPayload;

export type FetchBeatmapMessage = MessageEnvelope<{
  beatmapId: number;
  skipAutomationChecks?: boolean;
}>;

export type FetchMatchMessage = MessageEnvelope<{
  osuMatchId: number;
}>;

export type FetchPlayerMessage = MessageEnvelope<{
  osuPlayerId: number;
}>;

export type FetchPlayerOsuTrackMessage = MessageEnvelope<{
  osuPlayerId: number;
}>;

export type ProcessTournamentAutomationCheckMessage = MessageEnvelope<{
  tournamentId: number;
  overrideVerifiedState: boolean;
}>;

export type ProcessTournamentStatsMessage = MessageEnvelope<{
  tournamentId: number;
}>;

export type KnownQueueMessage =
  | FetchBeatmapMessage
  | FetchMatchMessage
  | FetchPlayerMessage
  | FetchPlayerOsuTrackMessage
  | ProcessTournamentAutomationCheckMessage
  | ProcessTournamentStatsMessage;

export type { MessageMetadata } from './values';
