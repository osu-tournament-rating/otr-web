import {
  GAME_REJECTION_REASON_LABELS,
  GAME_WARNING_FLAG_LABELS,
  MATCH_REJECTION_REASON_LABELS,
  MATCH_WARNING_FLAG_LABELS,
  SCORE_REJECTION_REASON_LABELS,
  TOURNAMENT_REJECTION_REASON_LABELS,
  getFlagLabels,
  type EnumLabels,
} from '@/lib/kit/format/enum-labels';
import type { ApiItemType } from '@/lib/types';

const WARNING_LABELS: Partial<Record<ApiItemType, EnumLabels>> = {
  match: MATCH_WARNING_FLAG_LABELS,
  game: GAME_WARNING_FLAG_LABELS,
};

const REJECTION_LABELS: Record<ApiItemType, EnumLabels> = {
  tournament: TOURNAMENT_REJECTION_REASON_LABELS,
  match: MATCH_REJECTION_REASON_LABELS,
  game: GAME_REJECTION_REASON_LABELS,
  score: SCORE_REJECTION_REASON_LABELS,
};

/**
 * The warning lines for an entity's warning flags, for a status tooltip.
 * Only matches and games carry warnings; the flags are a bitflag enum.
 */
export function getWarningTexts(
  entityType: ApiItemType,
  flags: number | null | undefined
): string[] {
  const labels = WARNING_LABELS[entityType];
  return labels && flags ? getFlagLabels(flags, labels) : [];
}

/** The rejection reason lines for an entity, one per set flag. */
export function getRejectionReasonTexts(
  entityType: ApiItemType,
  reason: number | null | undefined
): string[] {
  const labels = REJECTION_LABELS[entityType];
  return labels && reason ? getFlagLabels(reason, labels) : [];
}
