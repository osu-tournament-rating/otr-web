import type { MessageMetadata } from './values';

/** Metadata plus a message-specific payload. */
export type MessageEnvelope<TPayload> = MessageMetadata & TPayload;

/** Payloads for the unified osu! API queue, routed on `type`. */
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

export type OsuApiPayload =
  | FetchBeatmapPayload
  | FetchMatchPayload
  | FetchPlayerPayload;

/** Message type for the `data.osu` queue. */
export type FetchOsuMessage = MessageEnvelope<OsuApiPayload>;

// Legacy aliases.
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
