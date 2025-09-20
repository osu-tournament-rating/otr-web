import { z } from 'zod/v4';

import {
  RatingAdjustmentType,
  Ruleset,
  ScoreGrade,
  ScoringType,
  Team,
  TeamType,
  VerificationStatus,
} from '@/lib/osu/enums';

export const CreatedUpdatedOmit = {
  created: true,
  updated: true,
} as const;

export const RulesetSchema = z.nativeEnum(Ruleset);
export const ScoringTypeSchema = z.nativeEnum(ScoringType);
export const TeamTypeSchema = z.nativeEnum(TeamType);
export const TeamSchema = z.nativeEnum(Team);
export const ScoreGradeSchema = z.nativeEnum(ScoreGrade);
export const RatingAdjustmentTypeSchema = z.nativeEnum(RatingAdjustmentType);
export const VerificationStatusSchema = z.nativeEnum(VerificationStatus);

export type RulesetValue = z.infer<typeof RulesetSchema>;
export type ScoringTypeValue = z.infer<typeof ScoringTypeSchema>;
export type TeamTypeValue = z.infer<typeof TeamTypeSchema>;
export type TeamValue = z.infer<typeof TeamSchema>;
export type ScoreGradeValue = z.infer<typeof ScoreGradeSchema>;
export type RatingAdjustmentTypeValue = z.infer<
  typeof RatingAdjustmentTypeSchema
>;
export type VerificationStatusValue = z.infer<typeof VerificationStatusSchema>;
