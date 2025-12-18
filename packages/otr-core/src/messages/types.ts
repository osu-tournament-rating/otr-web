import type { MessageMetadata } from './values';

/**
 * Default envelope shape combining metadata with message-specific payload.
 */
export type MessageEnvelope<TPayload> = MessageMetadata & TPayload;

/**
 * Discriminated payload types for the unified osu! API queue.
 * The `type` field enables routing to the appropriate handler.
 */
export type FetchBeatmapPayload = {
  type: 'beatmap';
  beatmapId: number;
  skipAutomationChecks?: boolean;
};

export type FetchMatchPayload = {
  type: 'match';
  osuMatchId: number;
  isLazer: boolean;
};

export type FetchPlayerPayload = {
  type: 'player';
  osuPlayerId: number;
};

/**
 * Union of all osu! API payloads for the unified queue.
 */
export type OsuApiPayload =
  | FetchBeatmapPayload
  | FetchMatchPayload
  | FetchPlayerPayload;

/**
 * Unified message type for the `data.osu` queue.
 */
export type FetchOsuMessage = MessageEnvelope<OsuApiPayload>;

/**
 * Legacy type aliases for backwards compatibility.
 */
export type FetchBeatmapMessage = MessageEnvelope<FetchBeatmapPayload>;
export type FetchMatchMessage = MessageEnvelope<FetchMatchPayload>;
export type FetchPlayerMessage = MessageEnvelope<FetchPlayerPayload>;

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
  | FetchOsuMessage
  | FetchPlayerOsuTrackMessage
  | ProcessTournamentAutomationCheckMessage
  | ProcessTournamentStatsMessage;

export type { MessageMetadata } from './values';
