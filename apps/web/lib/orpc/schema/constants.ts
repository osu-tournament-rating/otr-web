import { z } from 'zod/v4';

import {
  RatingAdjustmentType,
  Ruleset,
  ScoreGrade,
  ScoringType,
  Team,
  TeamType,
  VerificationStatus,
} from '@otr/core/osu';

export const CreatedUpdatedOmit = {
  created: true,
  updated: true,
} as const;

export const RulesetSchema = z.enum(Ruleset);
export const ScoringTypeSchema = z.enum(ScoringType);
export const TeamTypeSchema = z.enum(TeamType);
export const TeamSchema = z.enum(Team);
export const ScoreGradeSchema = z.enum(ScoreGrade);
export const RatingAdjustmentTypeSchema = z.enum(RatingAdjustmentType);
export const VerificationStatusSchema = z.enum(VerificationStatus);

export type RulesetValue = z.infer<typeof RulesetSchema>;
export type ScoringTypeValue = z.infer<typeof ScoringTypeSchema>;
export type TeamTypeValue = z.infer<typeof TeamTypeSchema>;
export type TeamValue = z.infer<typeof TeamSchema>;
export type ScoreGradeValue = z.infer<typeof ScoreGradeSchema>;
export type RatingAdjustmentTypeValue = z.infer<
  typeof RatingAdjustmentTypeSchema
>;
export type VerificationStatusValue = z.infer<typeof VerificationStatusSchema>;
